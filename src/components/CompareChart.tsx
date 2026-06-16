"use client";

import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/types";

export interface CompareSeries {
  symbol: string;
  name: string;
  color: string;
  candles: Candle[];
}

interface Props {
  series: CompareSeries[];
  intraday?: boolean;
  height?: number;
}

/**
 * Multi-asset comparison chart. Each series is normalized to its percentage
 * change from the first available close in the range, so assets with very
 * different price levels (e.g. emas in USD vs saham IDR) are directly comparable.
 */
export default function CompareChart({
  series,
  intraday = false,
  height = 420,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || series.length === 0) return;
    let disposed = false;
    let chart: any;
    let handleResize: (() => void) | undefined;

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      const { createChart, ColorType, CrosshairMode, LineStyle } = lib;

      chart = createChart(ref.current, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#475569",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.22)" },
          horzLines: { color: "rgba(148,163,184,0.22)" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "rgba(148,163,184,0.45)" },
        timeScale: {
          borderColor: "rgba(148,163,184,0.45)",
          timeVisible: intraday,
          secondsVisible: false,
        },
      });

      // Zero baseline so gains/losses are visually obvious.
      let baselineAdded = false;

      for (const s of series) {
        if (s.candles.length === 0) continue;
        const base = s.candles[0].close;
        if (!base) continue;
        const line = chart.addLineSeries({
          color: s.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: {
            type: "custom",
            formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
          },
        });
        line.setData(
          s.candles.map((c) => ({
            time: c.time as any,
            value: ((c.close - base) / base) * 100,
          })),
        );
        if (!baselineAdded) {
          line.createPriceLine({
            price: 0,
            color: "rgba(156,163,175,0.5)",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false,
          });
          baselineAdded = true;
        }
      }

      chart.timeScale().fitContent();
      handleResize = () => {
        if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
      };
      handleResize();
      window.addEventListener("resize", handleResize);
    })();

    return () => {
      disposed = true;
      if (handleResize) window.removeEventListener("resize", handleResize);
      if (chart) chart.remove();
    };
  }, [series, intraday, height]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
