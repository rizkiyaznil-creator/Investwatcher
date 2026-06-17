"use client";

import { useEffect, useState } from "react";
import type { Financials, FinStatement } from "@/lib/financials";
import { yoy } from "@/lib/financials";
import InfoTip from "./InfoTip";

function money(n: number | null, currency: string): string {
  if (n == null) return "—";
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (currency === "IDR") {
    if (a >= 1e12) s = `${(a / 1e12).toFixed(2)} T`;
    else if (a >= 1e9) s = `${(a / 1e9).toFixed(2)} M`;
    else if (a >= 1e6) s = `${(a / 1e6).toFixed(1)} jt`;
    else s = a.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  } else {
    if (a >= 1e12) s = `${(a / 1e12).toFixed(2)} T`;
    else if (a >= 1e9) s = `${(a / 1e9).toFixed(2)} B`;
    else if (a >= 1e6) s = `${(a / 1e6).toFixed(1)} M`;
    else s = a.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return `${neg ? "−" : ""}${s}`;
}

function StatementTable({
  title,
  tip,
  st,
  currency,
}: {
  title: string;
  tip: string;
  st: FinStatement;
  currency: string;
}) {
  if (st.periods.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Data tidak tersedia.</p>
      </div>
    );
  }
  return (
    <div>
      <h4 className="text-sm font-semibold">
        <InfoTip text={tip}>{title}</InfoTip>
      </h4>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-left font-medium dark:bg-slate-900">
                Pos
              </th>
              {st.periods.map((p) => (
                <th key={p.endDate} className="whitespace-nowrap px-3 py-1.5 text-right font-medium">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {st.rows.map((row) => {
              const g = yoy(row);
              return (
                <tr key={row.key} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <span className="whitespace-nowrap">{row.label}</span>
                    {g != null && (
                      <span
                        className={`ml-1 text-[10px] ${g >= 0 ? "text-up" : "text-down"}`}
                        title="Pertumbuhan dibanding periode sebelumnya (YoY)"
                      >
                        {g >= 0 ? "▲" : "▼"}
                        {Math.abs(g).toFixed(0)}%
                      </span>
                    )}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={st.periods[i].endDate}
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                        v != null && v < 0 ? "text-down" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {money(v, currency)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinancialStatements({ symbol }: { symbol: string }) {
  const [fin, setFin] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/financials?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: Financials) => !cancelled && setFin(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Hidden entirely for assets without financial statements.
  if (!loading && fin && !fin.available) return null;

  const isJK = symbol.endsWith(".JK");
  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials`;
  const idxUrl =
    "https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan";
  const secUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${encodeURIComponent(symbol)}&type=10-K&dateb=&owner=include&count=40`;

  const data = fin && fin.available ? fin[period] : null;
  const currency = fin?.currency ?? "USD";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          📑 Laporan Keuangan
          {fin?.currency && (
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
              dalam {fin.currency}
            </span>
          )}
        </h2>
        {fin?.available && (
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            {(["annual", "quarterly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  period === p
                    ? "bg-white text-brand shadow-sm dark:bg-slate-700"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {p === "annual" ? "Tahunan" : "Kuartalan"}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !fin ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat laporan…</p>
      ) : data ? (
        <>
          {fin?.mock && (
            <p className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠️ Angka contoh (mock) — sumber live terbatas di lingkungan ini.
            </p>
          )}
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <StatementTable
              title="Laba Rugi"
              tip="Ringkasan pendapatan hingga laba bersih untuk tiap periode."
              st={data.income}
              currency={currency}
            />
            <StatementTable
              title="Neraca"
              tip="Posisi aset, liabilitas, dan ekuitas pada akhir periode."
              st={data.balance}
              currency={currency}
            />
            <StatementTable
              title="Arus Kas"
              tip="Arus kas operasi, belanja modal (capex), dan arus kas bebas (FCF = operasi + capex)."
              st={data.cashflow}
              currency={currency}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500">Sumber resmi / lengkap:</span>
            <a href={yahooUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              Yahoo Finance ↗
            </a>
            {isJK ? (
              <a href={idxUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                IDX (laporan emiten) ↗
              </a>
            ) : (
              <a href={secUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                SEC EDGAR (10-K) ↗
              </a>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Angka dari sumber pihak ketiga (Yahoo), bisa berbeda/telat dari laporan resmi teraudit —
            terutama emiten IDX. Edukatif, bukan saran investasi.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Data laporan tidak tersedia.</p>
      )}
    </div>
  );
}
