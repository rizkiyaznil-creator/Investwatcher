"use client";

import { useEffect, useState } from "react";
import type { AssetMetrics } from "@/lib/analytics";
import type { SignalSummary } from "@/lib/signals";
import type { MonthSeason } from "@/lib/seasonality";
import InfoTip from "./InfoTip";

interface Row {
  symbol: string;
  metrics: AssetMetrics;
  signals: SignalSummary;
  seasonality: MonthSeason[];
  mock: boolean;
}

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function pct(v: number | null, sign = true): string {
  if (v == null) return "—";
  const s = sign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}
function color(v: number | null): string {
  if (v == null) return "text-slate-400 dark:text-slate-500";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}

const VERDICT_STYLE: Record<string, string> = {
  "Beli Kuat": "bg-up/15 text-up",
  Beli: "bg-up/15 text-up",
  Tahan: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
  Jual: "bg-down/15 text-down",
  "Jual Kuat": "bg-down/15 text-down",
  "—": "bg-slate-200 text-slate-500 dark:bg-slate-700",
};

const SIG_CHIP: Record<string, string> = {
  buy: "bg-up/15 text-up",
  hold: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
  sell: "bg-down/15 text-down",
};
const SIG_LABEL: Record<string, string> = { buy: "Beli", hold: "Tahan", sell: "Jual" };

export default function AnalysisPanel({ symbol }: { symbol: string }) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analysis?symbols=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setRow(d.rows?.[0] ?? null))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading && !row) {
    return (
      <div className="card p-4 text-sm text-slate-500 dark:text-slate-400">
        Menganalisis…
      </div>
    );
  }
  if (!row) {
    return (
      <div className="card p-4 text-sm text-slate-500 dark:text-slate-400">
        Data tidak cukup untuk analisis.
      </div>
    );
  }

  const { metrics: m, signals: s, seasonality, mock } = row;
  const maxSeason = Math.max(
    1,
    ...seasonality.map((x) => (x.avg == null ? 0 : Math.abs(x.avg))),
  );
  const nowMonth = new Date().getMonth();

  return (
    <div className="space-y-4">
      {/* ===== Resume terpadu: Ringkasan & Rekomendasi ===== */}
      <div className="card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          🧭 Ringkasan &amp; Rekomendasi
          {mock && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              contoh
            </span>
          )}
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-lg px-3 py-1.5 text-lg font-bold ${VERDICT_STYLE[s.verdict]}`}
          >
            {s.verdict}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <InfoTip text="Gabungan beberapa sinyal teknikal (MA, RSI, MACD, Bollinger, momentum) menjadi proporsi Beli/Tahan/Jual. Bukan saran investasi.">
              berdasarkan {s.items.length} sinyal teknikal
            </InfoTip>
          </span>
        </div>

        {/* Stacked Beli/Tahan/Jual bar */}
        <div className="mt-4">
          <div className="flex h-6 w-full overflow-hidden rounded-lg">
            <div className="bg-up" style={{ width: `${s.buyPct}%` }} title={`Beli ${s.buyPct}%`} />
            <div className="bg-slate-300 dark:bg-slate-600" style={{ width: `${s.holdPct}%` }} title={`Tahan ${s.holdPct}%`} />
            <div className="bg-down" style={{ width: `${s.sellPct}%` }} title={`Jual ${s.sellPct}%`} />
          </div>
          <div className="mt-2 flex justify-between text-sm font-medium">
            <span className="text-up">Beli {s.buyPct}%</span>
            <span className="text-slate-500 dark:text-slate-400">Tahan {s.holdPct}%</span>
            <span className="text-down">Jual {s.sellPct}%</span>
          </div>
        </div>

        {/* Signal breakdown */}
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {s.items.map((it) => (
            <li key={it.label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
              <span className="min-w-0">
                <span className="block font-medium text-slate-700 dark:text-slate-200">{it.label}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{it.note}</span>
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${SIG_CHIP[it.signal]}`}>
                {SIG_LABEL[it.signal]}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Ringkasan teknikal otomatis untuk edukasi — <strong>bukan saran investasi</strong>. Selalu lakukan riset mandiri.
        </p>
      </div>

      {/* ===== Kinerja & Risiko ===== */}
      <div className="card p-4">
        <h3 className="mb-3 font-semibold">📊 Kinerja &amp; Risiko</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {m.returns.map((r) => (
            <div key={r.label} className="rounded-lg bg-slate-100 px-3 py-1.5 text-center dark:bg-slate-800">
              <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500">{r.label}</div>
              <div className={`text-sm font-medium tabular-nums ${color(r.value)}`}>{pct(r.value)}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Volatilitas" tip="Fluktuasi harga (deviasi standar imbal hasil harian, disetahunkan). Makin tinggi = makin berisiko." value={pct(m.volatility, false)} />
          <Metric label="Max Drawdown" tip="Penurunan terdalam dari puncak ke lembah." value={pct(m.maxDrawdown)} valueClass={color(m.maxDrawdown)} />
          <Metric label="CAGR" tip="Pertumbuhan rata-rata per tahun (majemuk)." value={pct(m.cagr)} valueClass={color(m.cagr)} />
          <Metric label="Imbal/Risiko" tip="CAGR ÷ volatilitas (mirip Sharpe). Makin tinggi makin sepadan." value={m.riskReward == null ? "—" : m.riskReward.toFixed(2)} />
        </div>
      </div>

      {/* ===== Seasonality ===== */}
      <div className="card p-4">
        <h3 className="mb-1 font-semibold">
          📅 <InfoTip text="Rata-rata imbal hasil per bulan kalender secara historis. Membantu melihat pola musiman (umum pada komoditas).">Pola Musiman (Seasonality)</InfoTip>
        </h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Rata-rata imbal hasil per bulan dari data historis.</p>
        <div className="flex items-end gap-1" style={{ height: 90 }}>
          {seasonality.map((mo) => {
            const v = mo.avg ?? 0;
            const h = mo.avg == null ? 0 : (Math.abs(v) / maxSeason) * 38;
            const up = v >= 0;
            return (
              <div key={mo.month} className="flex flex-1 flex-col items-center justify-end" title={`${MONTHS[mo.month]}: ${mo.avg == null ? "—" : pct(mo.avg)} (${mo.count}×)`}>
                <div className="flex h-[40px] w-full items-end justify-center">
                  {up && <div className="w-2.5 rounded-t bg-up" style={{ height: h }} />}
                </div>
                <div className="h-px w-full bg-slate-300 dark:bg-slate-600" />
                <div className="flex h-[40px] w-full items-start justify-center">
                  {!up && <div className="w-2.5 rounded-b bg-down" style={{ height: h }} />}
                </div>
                <div className={`mt-0.5 text-[9px] ${mo.month === nowMonth ? "font-bold text-brand" : "text-slate-400 dark:text-slate-500"}`}>
                  {MONTHS[mo.month][0]}
                </div>
              </div>
            );
          })}
        </div>
        {m.spanYears != null && (
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Berdasarkan ~{m.spanYears.toFixed(1)} tahun data. Edukatif, bukan saran investasi.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, tip, value, valueClass }: { label: string; tip: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        <InfoTip text={tip}>{label}</InfoTip>
      </div>
      <div className={`mt-0.5 font-medium tabular-nums ${valueClass ?? "text-slate-800 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}
