"use client";

import { useEffect, useState } from "react";
import type { DailyLevels } from "@/lib/intraday";
import { formatPrice } from "@/lib/format";
import InfoTip from "./InfoTip";

function Cell({
  label,
  value,
  cur,
  tone = "neutral",
  tip,
}: {
  label: string;
  value?: number;
  cur: string;
  tone?: "up" | "down" | "neutral" | "pivot";
  tip?: string;
}) {
  const toneClass =
    tone === "up"
      ? "text-up"
      : tone === "down"
        ? "text-down"
        : tone === "pivot"
          ? "text-brand font-semibold"
          : "";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {tip ? <InfoTip text={tip}>{label}</InfoTip> : label}
      </div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${toneClass}`}>
        {value != null ? formatPrice(value, cur) : "–"}
      </div>
    </div>
  );
}

export default function DailyLevels({ symbol }: { symbol: string }) {
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
  if (!d || !d.available) return null;

  const cur = d.currency ?? "IDR";
  const last = d.intraday?.last ?? d.prevClose;
  const vwap = d.intraday?.vwap;
  const aboveVwap = last != null && vwap != null ? last >= vwap : undefined;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          📐{" "}
          <InfoTip text="Level acuan untuk perdagangan harian: pivot points (dari OHLC hari sebelumnya), batas auto-reject IDX, VWAP, dan opening range. Edukatif, bukan saran investasi.">
            Level Harian (Day Trading)
          </InfoTip>
        </h2>
        {d.mock && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            contoh
          </span>
        )}
      </div>

      {/* Intraday snapshot */}
      {d.intraday && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Hari ini
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Cell label="Terakhir" value={d.intraday.last} cur={cur} />
            <Cell label="Open" value={d.intraday.open} cur={cur} />
            <Cell label="High" value={d.intraday.high} cur={cur} tone="up" />
            <Cell label="Low" value={d.intraday.low} cur={cur} tone="down" />
            <Cell
              label="VWAP"
              value={d.intraday.vwap}
              cur={cur}
              tone={aboveVwap === undefined ? "neutral" : aboveVwap ? "up" : "down"}
              tip="Volume-Weighted Average Price hari ini. Harga di atas VWAP = bias beli intraday; di bawah = bias jual."
            />
            <Cell
              label="Opening Range"
              value={d.intraday.orHigh}
              cur={cur}
              tip="High/Low 30 menit pertama sesi. Tembus OR-High sering jadi sinyal momentum lanjutan; tembus OR-Low sebaliknya."
            />
          </div>
          {d.intraday.orHigh != null && d.intraday.orLow != null && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Opening Range: {formatPrice(d.intraday.orLow, cur)} – {formatPrice(d.intraday.orHigh, cur)}
            </p>
          )}
        </div>
      )}

      {/* ARA / ARB (IDX only) */}
      {d.isIdx && d.autoReject && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <InfoTip text="Batas Auto Reject IDX: harga tidak boleh naik di atas ARA atau turun di bawah ARB dalam satu hari. Persentase tergantung rentang harga; aturan dapat berubah — verifikasi ke aturan IDX terbaru.">
              Batas Auto-Reject (acuan {formatPrice(d.prevClose ?? 0, cur)})
            </InfoTip>
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Cell label={`ARB (-${(d.autoReject.pct * 100).toFixed(0)}%)`} value={d.autoReject.arb} cur={cur} tone="down" />
            <Cell label="Prev Close" value={d.prevClose} cur={cur} tone="pivot" />
            <Cell label={`ARA (+${(d.autoReject.pct * 100).toFixed(0)}%)`} value={d.autoReject.ara} cur={cur} tone="up" />
          </div>
        </div>
      )}

      {/* Pivot points */}
      {d.pivots && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <InfoTip text="Pivot points klasik dari High/Low/Close hari perdagangan sebelumnya. R = resistance (potensi tahanan jual), S = support (potensi topangan beli), P = titik pivot.">
              Pivot Points (dari hari sebelumnya)
            </InfoTip>
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <Cell label="S3" value={d.pivots.s3} cur={cur} tone="down" />
            <Cell label="S2" value={d.pivots.s2} cur={cur} tone="down" />
            <Cell label="S1" value={d.pivots.s1} cur={cur} tone="down" />
            <Cell label="Pivot" value={d.pivots.p} cur={cur} tone="pivot" />
            <Cell label="R1" value={d.pivots.r1} cur={cur} tone="up" />
            <Cell label="R2" value={d.pivots.r2} cur={cur} tone="up" />
            <Cell label="R3" value={d.pivots.r3} cur={cur} tone="up" />
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Data intraday bisa telat ~15-20 menit (Yahoo) dan tanpa order book. Aturan tick & auto-reject
        IDX dapat berubah — verifikasi sebelum bertransaksi. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
