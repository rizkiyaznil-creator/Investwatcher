"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useForecastHistory } from "@/hooks/useForecastHistory";
import { formatPrice } from "@/lib/format";
import type { TechForecast } from "@/lib/forecast";

interface Row {
  symbol: string;
  loading: boolean;
  price?: number;
  currency?: string;
  mock?: boolean;
  tech?: TechForecast;
}

const PRESETS = [3, 6, 12, 24, 60];

function pctStr(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function color(v: number | null | undefined): string {
  if (v == null) return "text-slate-500 dark:text-slate-400";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}

export default function ForecastCompare() {
  const { all, resolve } = useCatalog();
  const { symbols: watchSymbols, loaded } = useWatchlist();
  const { add } = useForecastHistory();

  const selectable = useMemo(() => all.filter((a) => a.type !== "fx"), [all]);

  const [selected, setSelected] = useState<string[]>([]);
  const [horizon, setHorizon] = useState(12);
  const [amount, setAmount] = useState(10_000_000);
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Seed selection from the watchlist once it loads.
  useEffect(() => {
    if (loaded && selected.length === 0 && watchSymbols.length > 0) {
      setSelected(watchSymbols.slice(0, 8));
    }
  }, [loaded, watchSymbols, selected.length]);

  const selectedKey = selected.join(",");

  // Fetch technical forecasts for all selected assets at the chosen horizon.
  useEffect(() => {
    if (selected.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setRows(selected.map((s) => ({ symbol: s, loading: true })));
    setSaved({});
    Promise.all(
      selected.map(async (symbol) => {
        try {
          const res = await fetch(`/api/forecast?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}`);
          const d = await res.json();
          return { symbol, loading: false, price: d.price, currency: d.currency, mock: d.mock, tech: d.technical } as Row;
        } catch {
          return { symbol, loading: false } as Row;
        }
      }),
    ).then((res) => {
      if (!cancelled) setRows(res);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedKey, horizon]);

  const value = (retPct: number | null | undefined) =>
    retPct == null ? null : amount * (1 + retPct / 100);

  const addSymbol = (s: string) => {
    if (s && !selected.includes(s)) setSelected((p) => [...p, s]);
  };
  const removeSymbol = (s: string) => setSelected((p) => p.filter((x) => x !== s));

  const saveRow = (row: Row) => {
    if (!row.tech || row.tech.baseReturnPct == null || !row.price) return;
    add({
      symbol: row.symbol,
      assetName: resolve(row.symbol).short,
      method: "technical",
      horizonMonths: horizon,
      years: horizon / 12,
      basePrice: row.price,
      priceCurrency: row.currency ?? "USD",
      amount,
      amountCurrency: currency,
      expectedReturnPct: row.tech.baseReturnPct,
      lowReturnPct: row.tech.lowReturnPct ?? row.tech.baseReturnPct,
      highReturnPct: row.tech.highReturnPct ?? row.tech.baseReturnPct,
    });
    setSaved((p) => ({ ...p, [row.symbol]: true }));
  };

  const saveAll = () => rows.forEach(saveRow);

  const notSelected = selectable.filter((a) => !selected.includes(a.symbol));
  const anyMock = rows.some((r) => r.mock);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">⚖️ Bandingkan Proyeksi Aset</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Proyeksi teknikal beberapa aset sekaligus untuk horizon yang sama.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={rows.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:text-brand disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
        >
          💾 Simpan semua
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500 dark:text-slate-400">Tambah aset</span>
          <select
            value=""
            onChange={(e) => { addSymbol(e.target.value); e.target.value = ""; }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">+ pilih aset…</option>
            {notSelected.map((a) => (
              <option key={a.symbol} value={a.symbol}>{a.short} — {a.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500 dark:text-slate-400">Jumlah</span>
          <div className="flex gap-1">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "IDR" | "USD")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="IDR">Rp</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-slate-500 dark:text-slate-400">Jangka waktu</span>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setHorizon(m)}
                className={`rounded-lg border px-2.5 py-1 text-sm transition-colors ${
                  horizon === m
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-slate-300 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {m} bln
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {resolve(s).short}
              <button onClick={() => removeSymbol(s)} className="text-slate-400 hover:text-down" aria-label="Hapus">✕</button>
            </span>
          ))}
        </div>
      )}

      {anyMock && (
        <p className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Sebagian data adalah contoh (mock) — sumber live terbatas di lingkungan ini.
        </p>
      )}

      {selected.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Tambahkan aset untuk membandingkan.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-2 text-left font-medium">Aset</th>
                <th className="px-3 py-2 text-right font-medium">Harga</th>
                <th className="px-3 py-2 text-right font-medium">Proyeksi {horizon}b</th>
                <th className="px-3 py-2 text-right font-medium">Rentang</th>
                <th className="px-3 py-2 text-right font-medium">Nilai proyeksi</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (b.tech?.baseReturnPct ?? -Infinity) - (a.tech?.baseReturnPct ?? -Infinity))
                .map((row) => {
                  const t = row.tech;
                  const ok = t && t.baseReturnPct != null;
                  return (
                    <tr key={row.symbol} className="border-b border-slate-200 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{resolve(row.symbol).short}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {row.price != null && row.currency ? formatPrice(row.price, row.currency) : "—"}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${color(t?.baseReturnPct)}`}>
                        {row.loading ? "…" : ok ? pctStr(t!.baseReturnPct) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {ok ? `${pctStr(t!.lowReturnPct)}…${pctStr(t!.highReturnPct)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {ok ? formatPrice(value(t!.baseReturnPct)!, currency) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => saveRow(row)}
                          disabled={!ok || saved[row.symbol]}
                          className="text-xs text-slate-400 hover:text-brand disabled:opacity-40"
                          title="Simpan ke riwayat"
                        >
                          {saved[row.symbol] ? "✓ tersimpan" : "💾 simpan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Proyeksi teknikal dari tren historis (CAGR &amp; volatilitas). Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
