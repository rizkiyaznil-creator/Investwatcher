"use client";

import { useCallback, useEffect, useState } from "react";
import { useForecastHistory, type ForecastRecord } from "@/hooks/useForecastHistory";
import { projectedBandAt } from "@/lib/forecast";
import { formatPrice } from "@/lib/format";

interface QuoteLite {
  price: number;
  currency: string;
  mock?: boolean;
}

function pctStr(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function color(v: number | null | undefined): string {
  if (v == null) return "text-slate-500 dark:text-slate-400";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Verdict = "atas" | "dalam" | "bawah";
const VERDICT_CHIP: Record<Verdict, { label: string; cls: string }> = {
  atas: { label: "Di atas perkiraan", cls: "bg-up/15 text-up" },
  dalam: { label: "Sesuai perkiraan", cls: "bg-brand/15 text-brand" },
  bawah: { label: "Di bawah perkiraan", cls: "bg-down/15 text-down" },
};

export default function ForecastHistory() {
  const { records, loaded, remove, clear } = useForecastHistory();
  const [quotes, setQuotes] = useState<Record<string, QuoteLite>>({});
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const symbolsKey = records.map((r) => r.symbol).join(",");

  const refresh = useCallback(async () => {
    const symbols = Array.from(new Set(records.map((r) => r.symbol)));
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
      const d = await res.json();
      const map: Record<string, QuoteLite> = {};
      for (const q of d.quotes ?? []) {
        if (q?.symbol) map[q.symbol] = { price: q.price, currency: q.currency, mock: q.mock };
      }
      setQuotes(map);
      setCheckedAt(Date.now());
    } catch {
      /* ignore */
    } finally {
      setChecking(false);
    }
  }, [records]);

  // Auto-fetch current prices when the set of symbols changes.
  useEffect(() => {
    if (!loaded) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, symbolsKey]);

  if (!loaded || records.length === 0) return null;

  const now = Date.now();

  function evaluate(rec: ForecastRecord) {
    const q = quotes[rec.symbol];
    if (!q || !rec.basePrice) return null;
    const realizedPct = (q.price / rec.basePrice - 1) * 100;
    const band = projectedBandAt(rec, now);
    const done = now >= rec.targetAt;
    return { realizedPct, band, done, current: q };
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">📒 Riwayat Proyeksi</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Proyeksi yang Anda simpan, dibandingkan dengan harga aktual saat ini
            (konfirmasi dunia nyata).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={checking}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            {checking ? "Memeriksa…" : "↻ Periksa"}
          </button>
          <button
            onClick={() => {
              if (window.confirm("Hapus semua riwayat proyeksi?")) clear();
            }}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-500 hover:text-down dark:border-slate-700 dark:text-slate-400"
          >
            Bersihkan
          </button>
        </div>
      </div>

      {checkedAt && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Diperiksa: {new Date(checkedAt).toLocaleString("id-ID")}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-3 py-2 text-left font-medium">Aset</th>
              <th className="px-3 py-2 text-left font-medium">Dibuat → Tempo</th>
              <th className="px-3 py-2 text-right font-medium">Proyeksi (target)</th>
              <th className="px-3 py-2 text-right font-medium">Acuan s/d kini</th>
              <th className="px-3 py-2 text-right font-medium">Realisasi</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const c = evaluate(rec);
              let verdict: Verdict | null = null;
              if (c) {
                if (c.realizedPct > c.band.highSoFarPct) verdict = "atas";
                else if (c.realizedPct < c.band.lowSoFarPct) verdict = "bawah";
                else verdict = "dalam";
              }
              const elapsedPct = c ? Math.round(c.band.elapsedFraction * 100) : 0;
              return (
                <tr
                  key={rec.id}
                  className="border-b border-slate-200 last:border-0 align-top dark:border-slate-800"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{rec.assetName}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <span className={rec.method === "ai" ? "text-brand" : ""}>
                        {rec.method === "ai" ? `🤖 ${rec.providerLabel ?? "AI"}` : "📈 Teknikal"}
                      </span>
                      <span>· {rec.horizonMonths} bln</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div>{fmtDate(rec.createdAt)}</div>
                    <div className="text-slate-400 dark:text-slate-500">
                      → {fmtDate(rec.targetAt)} {c?.done ? "✓" : `(${elapsedPct}%)`}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div className={color(rec.expectedReturnPct)}>{pctStr(rec.expectedReturnPct)}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {pctStr(rec.lowReturnPct)}…{pctStr(rec.highReturnPct)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c ? (
                      <>
                        <div className={color(c.band.expectedSoFarPct)}>{pctStr(c.band.expectedSoFarPct)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {pctStr(c.band.lowSoFarPct)}…{pctStr(c.band.highSoFarPct)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c ? (
                      <>
                        <div className={`font-medium ${color(c.realizedPct)}`}>{pctStr(c.realizedPct)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {formatPrice(c.current.price, c.current.currency)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {verdict ? (
                      <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${VERDICT_CHIP[verdict].cls}`}>
                        {c?.done ? "Final · " : ""}{VERDICT_CHIP[verdict].label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">menunggu data</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => remove(rec.id)}
                      className="text-slate-400 hover:text-down"
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        &quot;Acuan s/d kini&quot; = rentang yang diharapkan proyeksi hingga waktu berjalan
        ({/* */}sebagian horizon). Realisasi di luar rentang berarti aset bergerak lebih
        cepat/lambat dari perkiraan — bukan berarti proyeksi salah. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
