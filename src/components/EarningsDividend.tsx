"use client";

import { useEffect, useState } from "react";
import type { CalendarInfo } from "@/lib/calendar";
import InfoTip from "./InfoTip";

function fmtDate(sec?: number): string {
  if (sec == null) return "—";
  return new Date(sec * 1000).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function countdown(days?: number): string {
  if (days == null) return "";
  if (days === 0) return "hari ini";
  if (days > 0) return `dalam ${days} hari`;
  return `${Math.abs(days)} hari lalu`;
}

function Stat({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {tip ? <InfoTip text={tip}>{label}</InfoTip> : label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function EarningsDividend({ symbol }: { symbol: string }) {
  const [cal, setCal] = useState<CalendarInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/calendar?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: CalendarInfo) => !cancelled && setCal(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading && !cal) return null;
  if (!cal || !cal.available) return null;

  const e = cal.earnings;
  const d = cal.dividend;
  const cur = cal.currency ?? "";

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold">
        🗓️{" "}
        <InfoTip text="Jadwal rilis laporan keuangan (earnings) berikutnya dan informasi dividen. Rilis laporan sering memicu pergerakan harga; ex-date adalah batas kepemilikan agar berhak menerima dividen.">
          Jadwal Laporan & Dividen
        </InfoTip>
      </h2>

      {cal.mock && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Angka contoh (mock) — sumber live terbatas di lingkungan ini.
        </p>
      )}

      {e?.nextDate != null && (
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">📈 Laporan berikutnya</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="Tanggal"
              value={fmtDate(e.nextDate)}
              tip="Perkiraan tanggal rilis laporan keuangan kuartalan berikutnya (bisa berubah)."
            />
            <Stat label="Hitung mundur" value={countdown(e.daysUntil) || "—"} />
            {e.epsEstimate != null && (
              <Stat
                label="Estimasi EPS"
                value={
                  e.epsLow != null && e.epsHigh != null
                    ? `${e.epsEstimate.toFixed(2)} (${e.epsLow.toFixed(2)}–${e.epsHigh.toFixed(2)})`
                    : e.epsEstimate.toFixed(2)
                }
                tip="Perkiraan laba per saham (EPS) menurut konsensus analis untuk laporan berikutnya."
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">💰 Dividen</h3>
        {d ? (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {d.yieldPct != null && (
              <Stat
                label="Dividend yield"
                value={`${d.yieldPct.toFixed(2)}%`}
                tip="Dividen tahunan dibagi harga saham — perkiraan imbal hasil dari dividen saja."
              />
            )}
            {d.rate != null && (
              <Stat label="Dividen/saham" value={`${d.rate} ${cur}`} tip="Perkiraan dividen tahunan per lembar saham." />
            )}
            {d.payoutRatio != null && (
              <Stat
                label="Payout ratio"
                value={`${(d.payoutRatio * 100).toFixed(0)}%`}
                tip="Porsi laba yang dibagikan sebagai dividen. Terlalu tinggi (>100%) bisa kurang berkelanjutan."
              />
            )}
            {d.exDate != null && (
              <Stat
                label="Ex-date"
                value={fmtDate(d.exDate)}
                tip="Batas tanggal: untuk berhak atas dividen, saham harus dimiliki sebelum tanggal ini."
              />
            )}
            {d.payDate != null && <Stat label="Tanggal bayar" value={fmtDate(d.payDate)} tip="Perkiraan tanggal pembayaran dividen." />}
            {d.lastValue != null && (
              <Stat label="Dividen terakhir" value={`${d.lastValue} ${cur}${d.lastDate != null ? ` · ${fmtDate(d.lastDate)}` : ""}`} />
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tidak membagikan dividen / data tidak tersedia.
          </p>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Tanggal & estimasi dari sumber pihak ketiga (Yahoo), bisa berubah. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
