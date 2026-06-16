"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Candle, RangeKey } from "@/lib/types";
import { useCatalog } from "@/components/CatalogContext";
import { colorAt } from "@/lib/colors";
import { formatPercent } from "@/lib/format";
import CompareChart, { type CompareSeries } from "@/components/CompareChart";

const RANGES: RangeKey[] = ["1W", "1M", "3M", "1Y", "5Y"];
const INTRADAY: RangeKey[] = ["1W"];
const MAX = 6;
const DEFAULT = ["GC=F", "SI=F", "CL=F"];

export default function ComparePage() {
  const { all, resolve } = useCatalog();
  const [selected, setSelected] = useState<string[]>(DEFAULT);
  const [range, setRange] = useState<RangeKey>("3M");
  const [data, setData] = useState<Record<string, Candle[]>>({});
  const [loading, setLoading] = useState(false);
  const [mock, setMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      selected.map((symbol) =>
        fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
          .then((r) => r.json())
          .then((d) => ({ symbol, candles: d.candles ?? [], mock: !!d.mock }))
          .catch(() => ({ symbol, candles: [] as Candle[], mock: true })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, Candle[]> = {};
      let anyMock = false;
      for (const r of results) {
        map[r.symbol] = r.candles;
        if (r.mock) anyMock = true;
      }
      setData(map);
      setMock(anyMock);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, range]);

  const series: CompareSeries[] = useMemo(
    () =>
      selected.map((symbol, i) => ({
        symbol,
        name: resolve(symbol).short,
        color: colorAt(i),
        candles: data[symbol] ?? [],
      })),
    [selected, data],
  );

  const performance = useMemo(() => {
    return series.map((s) => {
      const c = s.candles;
      if (c.length < 2) return { ...s, change: null as number | null };
      const base = c[0].close;
      const last = c[c.length - 1].close;
      return { ...s, change: base ? ((last - base) / base) * 100 : null };
    });
  }, [series]);

  const toggle = (symbol: string) => {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= MAX) return prev;
      return [...prev, symbol];
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Perbandingan Aset</h1>
        <p className="text-sm text-slate-500">
          Bandingkan kinerja beberapa aset (dinormalisasi ke % perubahan dari
          awal periode). Pilih hingga {MAX} aset.
        </p>
      </div>

      {mock && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ⚠️ Sebagian/semua data adalah contoh (mock) — sumber live belum dapat
          diakses dari lingkungan ini.
        </div>
      )}

      {/* Range */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              range === r ? "bg-brand text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-4">
        {selected.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center text-slate-500">
            Pilih minimal satu aset di bawah.
          </div>
        ) : loading && Object.keys(data).length === 0 ? (
          <div className="flex h-[420px] items-center justify-center text-slate-500">
            Memuat…
          </div>
        ) : (
          <CompareChart series={series} intraday={INTRADAY.includes(range)} />
        )}

        {/* Legend / performance */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
          {performance.map((p) => (
            <span key={p.symbol} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-3 rounded"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-slate-600">{p.name}</span>
              {p.change != null && (
                <span
                  className={
                    p.change >= 0 ? "text-up tabular-nums" : "text-down tabular-nums"
                  }
                >
                  {formatPercent(p.change)}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Asset selector */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-600">
          Pilih aset ({selected.length}/{MAX})
        </h3>
        <div className="flex flex-wrap gap-2">
          {all.filter((a) => a.type !== "fx").map((a) => {
            const on = selected.includes(a.symbol);
            const disabled = !on && selected.length >= MAX;
            return (
              <button
                key={a.symbol}
                onClick={() => toggle(a.symbol)}
                disabled={disabled}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  on
                    ? "border-brand bg-brand/15 text-brand"
                    : disabled
                      ? "cursor-not-allowed border-slate-200 text-slate-400"
                      : "border-slate-300 text-slate-500 hover:text-slate-800"
                }`}
              >
                {a.icon} {a.short}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
