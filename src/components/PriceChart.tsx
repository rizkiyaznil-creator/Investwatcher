"use client";

import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/types";
import type { LinePoint } from "@/lib/indicators";
import { useTheme } from "./ThemeContext";
import { chartPalette } from "@/lib/chartTheme";

export interface Overlay {
  label: string;
  color: string;
  data: LinePoint[];
}

interface Props {
  candles: Candle[];
  type: "area" | "candlestick";
  overlays?: Overlay[];
  intraday?: boolean;
  height?: number;
}

/** Main price chart powered by TradingView lightweight-charts (v4 API). */
export default function PriceChart({
  candles,
  type,
  overlays = [],
  intraday = false,
  height = 380,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    let disposed = false;
    let chart: any;
    let handleResize: (() => void) | undefined;
    const pal = chartPalette(resolved);

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      const { createChart, ColorType, CrosshairMode } = lib;

      chart = createChart(ref.current, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: pal.axis,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: pal.grid },
          horzLines: { color: pal.grid },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: pal.border },
        timeScale: {
          borderColor: pal.border,
          timeVisible: intraday,
          secondsVisible: false,
        },
        autoSize: false,
      });

      if (type === "candlestick") {
        const s = chart.addCandlestickSeries({
          upColor: "#16a34a",
          downColor: "#dc2626",
          borderUpColor: "#16a34a",
          borderDownColor: "#dc2626",
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
        });
        s.setData(
          candles.map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
      } else {
        const first = candles[0]?.close ?? 0;
        const last = candles[candles.length - 1]?.close ?? 0;
        const up = last >= first;
        const s = chart.addAreaSeries({
          lineColor: up ? "#16a34a" : "#dc2626",
          topColor: up ? "rgba(22,163,74,0.30)" : "rgba(220,38,38,0.30)",
          bottomColor: "rgba(0,0,0,0)",
          lineWidth: 2,
        });
        s.setData(
          candles.map((c) => ({ time: c.time as any, value: c.close })),
        );
      }

      for (const ov of overlays) {
        if (!ov.data.length) continue;
        const line = chart.addLineSeries({
          color: ov.color,
          lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        line.setData(ov.data.map((p) => ({ time: p.time as any, value: p.value })));
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
  }, [candles, type, overlays, intraday, height, resolved]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
