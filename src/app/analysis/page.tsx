"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AssetMetrics } from "@/lib/analytics";
import type { SignalSummary } from "@/lib/signals";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useCatalog } from "@/components/CatalogContext";
import InfoTip from "@/components/InfoTip";
import CorrelationMatrix from "@/components/CorrelationMatrix";
import InvestmentCalculator from "@/components/InvestmentCalculator";

interface Row {
  symbol: string;
  metrics: AssetMetrics;
  signals?: SignalSummary;
  mock: boolean;
}

type SortKey =
  | "name"
  | "r1B"
  | "r3B"
  | "YTD"
  | "r1Th"
  | "vol"
  | "mdd"
  | "cagr"
  | "rr"
  | "signal";

function ret(m: AssetMetrics, label: string): number | null {
  return m.returns.find((r) => r.label === label)?.value ?? null;
}

function val(row: Row, key: SortKey): number | null {
  const m = row.metrics;
  switch (key) {
    case "r1B": return ret(m, "1B");
    case "r3B": return ret(m, "3B");
    case "YTD": return ret(m, "YTD");
    case "r1Th": return ret(m, "1Th");
    case "vol": return m.volatility;
    case "mdd": return m.maxDrawdown;
    case "cagr": return m.cagr;
    case "rr": return m.riskReward;
    case "signal": return row.signals?.score ?? null;
    default: return null;
  }
}

const VERDICT_CHIP: Record<string, string> = {
  "Beli Kuat": "bg-up/15 text-up",
  Beli: "bg-up/15 text-up",
  Tahan: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
  Jual: "bg-down/15 text-down",
  "Jual Kuat": "bg-down/15 text-down",
};

function pct(v: number | null, sign = true): string {
  if (v == null) return "—";
  const s = sign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function color(v: number | null): string {
  if (v == null) return "text-slate-400 dark:text-slate-500";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "";
}

const COLUMNS: { key: SortKey; label: string; tip?: string }[] = [
  { key: "r1B", label: "1B", tip: "Imbal hasil 1 bulan." },
  { key: "r3B", label: "3B", tip: "Imbal hasil 3 bulan." },
  { key: "YTD", label: "YTD", tip: "Imbal hasil sejak awal tahun." },
  { key: "r1Th", label: "1Th", tip: "Imbal hasil 1 tahun." },
  { key: "vol", label: "Volatilitas", tip: "Fluktuasi harga (disetahunkan). Makin tinggi makin berisiko." },
  { key: "mdd", label: "Max DD", tip: "Penurunan terdalam dari puncak (max drawdown)." },
  { key: "cagr", label: "CAGR", tip: "Pertumbuhan rata-rata per tahun (majemuk)." },
  { key: "rr", label: "Imbal/Risiko", tip: "CAGR ÷ volatilitas (mirip Sharpe). Makin tinggi makin sepadan." },
  { key: "signal", label: "Sinyal", tip: "Ringkasan sinyal teknikal (Beli/Tahan/Jual). Edukatif, bukan saran investasi." },
];

export default function AnalysisPage() {
  const { symbols, loaded } = useWatchlist();
  const { resolve } = useCatalog();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mock, setMock] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("cagr");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    if (!loaded || symbols.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analysis?symbols=${encodeURIComponent(symbols.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        setMock((d.rows ?? []).some((r: Row) => r.mock));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loaded, symbols]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === "name") {
        const an = resolve(a.symbol).short;
        const bn = resolve(b.symbol).short;
        return asc ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      const av = val(a, sortKey);
      const bv = val(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls last
      if (bv == null) return -1;
      return asc ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, asc, resolve]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (asc ? " ▲" : " ▼") : "");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Analisis Kinerja &amp; Risiko</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bandingkan imbal hasil dan risiko seluruh aset di watchlist. Klik
          judul kolom untuk mengurutkan.
        </p>
      </div>

      {mock && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠️ Sebagian/semua data adalah contoh (mock) — sumber live belum dapat diakses dari lingkungan ini.
        </div>
      )}

      <InvestmentCalculator />

      {symbols.length === 0 ? (
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          Watchlist kosong — tambahkan aset di Dashboard dulu.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-medium hover:text-slate-800 dark:hover:text-slate-100"
                    onClick={() => toggleSort("name")}
                  >
                    Aset{arrow("name")}
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="cursor-pointer whitespace-nowrap px-4 py-3 text-right font-medium hover:text-slate-800 dark:hover:text-slate-100"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.tip ? <InfoTip align="right" text={c.tip}>{c.label}</InfoTip> : c.label}
                      {arrow(c.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Menghitung…
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => {
                    const asset = resolve(row.symbol);
                    const m = row.metrics;
                    return (
                      <tr
                        key={row.symbol}
                        className="border-b border-slate-200 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/asset/${encodeURIComponent(row.symbol)}`} className="flex items-center gap-2">
                            <span>{asset.icon}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-100">{asset.short}</span>
                          </Link>
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(ret(m, "1B"))}`}>{pct(ret(m, "1B"))}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(ret(m, "3B"))}`}>{pct(ret(m, "3B"))}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(ret(m, "YTD"))}`}>{pct(ret(m, "YTD"))}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(ret(m, "1Th"))}`}>{pct(ret(m, "1Th"))}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{pct(m.volatility, false)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(m.maxDrawdown)}`}>{pct(m.maxDrawdown)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${color(m.cagr)}`}>{pct(m.cagr)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                          {m.riskReward == null ? "—" : m.riskReward.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.signals && row.signals.verdict !== "—" ? (
                            <span
                              className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${VERDICT_CHIP[row.signals.verdict] ?? ""}`}
                              title={`Beli ${row.signals.buyPct}% · Tahan ${row.signals.holdPct}% · Jual ${row.signals.sellPct}%`}
                            >
                              {row.signals.verdict}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Analisis edukatif berdasarkan data harga historis — bukan saran investasi.
          </p>
        </div>
      )}

      {symbols.length >= 2 && <CorrelationMatrix symbols={symbols} />}
    </div>
  );
}
