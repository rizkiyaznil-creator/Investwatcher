"use client";

import { useEffect, useRef } from "react";
import type { LinePoint } from "@/lib/indicators";
import { useTheme } from "./ThemeContext";
import { chartPalette } from "@/lib/chartTheme";

interface Props {
  data: LinePoint[];
  height?: number;
}

/** Compact RSI sub-chart with 30/70 guide lines. */
export default function RsiChart({ data, height = 130 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!ref.current || !data.length) return;
    let disposed = false;
    let chart: any;
    let handleResize: (() => void) | undefined;
    const pal = chartPalette(resolved);

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      const { createChart, ColorType, LineStyle } = lib;

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
        rightPriceScale: {
          borderColor: pal.border,
          autoScale: false,
        },
        timeScale: { borderColor: pal.border, visible: false },
      });

      const series = chart.addLineSeries({
        color: "#a855f7",
        lineWidth: 1.5,
        priceLineVisible: false,
      });
      series.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
      series.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 100 },
        }),
      });

      [30, 70].forEach((lvl) => {
        series.createPriceLine({
          price: lvl,
          color: lvl === 70 ? "#dc2626" : "#16a34a",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: String(lvl),
        });
      });

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
  }, [data, height, resolved]);

  if (!data.length) {
    return (
      <div className="flex h-[130px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Data tidak cukup untuk menghitung RSI pada rentang ini.
      </div>
    );
  }
  return <div ref={ref} className="w-full" style={{ height }} />;
}
