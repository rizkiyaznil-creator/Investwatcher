"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IntradayRow, IntradayScreen } from "@/lib/intraday-screener";
import { formatPrice } from "@/lib/format";
import InfoTip from "./InfoTip";

const TOP = 8;

function changeClass(v?: number) {
  return (v ?? 0) >= 0 ? "text-up" : "text-down";
}

export default function ScalpingSignals() {
  const [data, setData] = useState<IntradayScreen | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/intraday-screener")
      .then((r) => r.json())
      .then((d: IntradayScreen) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Candidates with at least one bullish setup, ranked by momentum score.
  const picks = useMemo(() => {
    const rows = (data?.rows ?? []).filter(
      (r) => r.signals.length > 0 && (r.changePct ?? 0) >= 0,
    );
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, TOP);
  }, [data]);

  return (
    <div className="card border-brand/30 bg-brand/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          ⚡{" "}
          <InfoTip text="Saham IDX yang secara teknikal intraday menunjukkan potensi untuk scalping/day trading: di atas VWAP, breakout opening range, volume relatif tinggi, dekat high, atau menguat. Edukatif, bukan saran investasi.">
            Sinyal Scalping / Day Trading (IDX)
          </InfoTip>
        </h2>
        <div className="flex items-center gap-3">
          <Link href="/intraday" className="text-xs text-brand hover:underline">
            Lihat semua →
          </Link>
          <button onClick={load} disabled={loading} className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            {loading ? "Memuat…" : "↻"}
          </button>
        </div>
      </div>

      {data?.mock && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Angka contoh (mock) di lingkungan ini; realtime di produksi.
        </p>
      )}

      {loading && !data ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Memindai saham IDX…</p>
      ) : picks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Belum ada setup teknikal kuat saat ini (mungkin di luar jam bursa). Coba lagi saat sesi berjalan.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {picks.map((r, i) => (
            <Pick key={r.symbol} r={r} rank={i + 1} />
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Data intraday bisa telat ~15-20 menit & tanpa order book. Untuk persiapan/watchlist, bukan eksekusi.
      </p>
    </div>
  );
}

function Pick({ r, rank }: { r: IntradayRow; rank: number }) {
  return (
    <Link
      href={`/asset/${encodeURIComponent(r.symbol)}`}
      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-brand/40 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="w-5 shrink-0 text-center text-sm font-bold text-slate-400 dark:text-slate-500">{rank}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{r.name}</span>
          <span className="shrink-0 rounded bg-brand/10 px-1.5 py-0.5 text-xs font-bold tabular-nums text-brand">
            {r.score}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {r.last != null && <span className="font-medium text-slate-700 dark:text-slate-200">{formatPrice(r.last, r.currency)}</span>}
          <span className={changeClass(r.changePct)}>
            {(r.changePct ?? 0) >= 0 ? "+" : ""}
            {r.changePct != null ? r.changePct.toFixed(2) : "–"}%
          </span>
          {r.relVol != null && <span>RelVol {r.relVol.toFixed(1)}x</span>}
        </div>
        {r.signals.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.signals.map((s) => (
              <span key={s} className="rounded-full bg-up/10 px-1.5 py-0.5 text-[10px] font-medium text-up">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
