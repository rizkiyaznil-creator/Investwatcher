"use client";

import { useEffect, useState } from "react";
import type { AssetMetrics } from "@/lib/analytics";
import InfoTip from "./InfoTip";

function pct(v: number | null, withSign = true): string {
  if (v == null) return "—";
  const s = withSign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function color(v: number | null): string {
  if (v == null) return "text-slate-400 dark:text-slate-500";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}

export default function MetricsCard({ symbol }: { symbol: string }) {
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analysis?symbols=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const row = d.rows?.[0];
        setMetrics(row?.metrics ?? null);
        setMock(!!row?.mock);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        📊 Kinerja &amp; Risiko
        {mock && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            contoh
          </span>
        )}
      </h3>

      {loading && !metrics ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Menghitung…</p>
      ) : !metrics ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Data tidak cukup untuk analisis.
        </p>
      ) : (
        <>
          {/* Returns */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <InfoTip text="Imbal hasil (perubahan harga) selama periode tersebut. YTD = sejak awal tahun berjalan.">
                Imbal hasil
              </InfoTip>
            </p>
            <div className="flex flex-wrap gap-2">
              {metrics.returns.map((r) => (
                <div
                  key={r.label}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-center dark:bg-slate-800"
                >
                  <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500">
                    {r.label}
                  </div>
                  <div className={`text-sm font-medium tabular-nums ${color(r.value)}`}>
                    {pct(r.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Volatilitas"
              tip="Seberapa berfluktuasi harga (deviasi standar imbal hasil harian, disetahunkan). Makin tinggi = makin berisiko/liar."
              value={pct(metrics.volatility, false)}
            />
            <Metric
              label="Max Drawdown"
              tip="Penurunan terdalam dari puncak ke lembah selama data tersedia — gambaran kerugian terburuk yang pernah terjadi."
              value={pct(metrics.maxDrawdown)}
              valueClass={color(metrics.maxDrawdown)}
            />
            <Metric
              label="CAGR"
              tip="Compound Annual Growth Rate: pertumbuhan rata-rata per tahun (majemuk) selama rentang data."
              value={pct(metrics.cagr)}
              valueClass={color(metrics.cagr)}
            />
            <Metric
              label="Imbal/Risiko"
              tip="Rasio mirip Sharpe (CAGR ÷ volatilitas, suku bunga bebas risiko = 0). Makin tinggi = imbal hasil makin sepadan dengan risikonya."
              value={metrics.riskReward == null ? "—" : metrics.riskReward.toFixed(2)}
            />
          </div>

          {metrics.spanYears != null && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Berdasarkan ~{metrics.spanYears.toFixed(1)} tahun data historis.
              Analisis edukatif, bukan saran investasi.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  tip,
  value,
  valueClass,
}: {
  label: string;
  tip: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        <InfoTip text={tip}>{label}</InfoTip>
      </div>
      <div className={`mt-0.5 font-medium tabular-nums ${valueClass ?? "text-slate-800 dark:text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}
