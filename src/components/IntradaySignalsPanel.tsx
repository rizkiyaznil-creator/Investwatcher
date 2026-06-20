"use client";

import { useEffect, useState } from "react";
import type { DailyLevels } from "@/lib/intraday";
import InfoTip from "./InfoTip";

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

export default function IntradaySignalsPanel({ symbol }: { symbol: string }) {
  const [d, setD] = useState<DailyLevels | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/intraday?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((x: DailyLevels) => !cancelled && setD(x))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading && !d) return null;
  const s = d?.signals;
  if (!s || !s.available) return null;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          ⚡{" "}
          <InfoTip text="Gabungan sinyal teknikal jangka sangat pendek dari candle 5 menit (VWAP, EMA9/EMA20, RSI, MACD) menjadi Beli/Tahan/Jual. Untuk scalping/day trading. Edukatif, bukan saran investasi.">
            Sinyal Intraday (5m)
          </InfoTip>
        </h2>
        {d?.mock && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            contoh
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-lg px-3 py-1.5 text-lg font-bold ${VERDICT_STYLE[s.verdict]}`}>
          {s.verdict}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          berdasarkan {s.items.length} sinyal 5 menit
        </span>
        {s.rsi != null && (
          <span className="text-xs text-slate-400 dark:text-slate-500">RSI {s.rsi.toFixed(0)}</span>
        )}
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

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {s.items.map((it) => (
          <li
            key={it.label}
            className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800"
          >
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

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Timeframe 5 menit; data bisa telat ~15-20 menit. Sinyal jangka sangat pendek berisiko tinggi.
        Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
