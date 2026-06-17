"use client";

import { useEffect, useState } from "react";
import type { RelativeValuation } from "@/lib/valuation";
import InfoTip from "./InfoTip";

function num(n: number | undefined): string {
  return n == null || !Number.isFinite(n) || n <= 0 ? "—" : n.toFixed(1);
}

function verdictStyle(v?: string): string {
  if (v === "lebih mahal") return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  if (v === "lebih murah") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export default function ValuationPeers({ symbol }: { symbol: string }) {
  const [rv, setRv] = useState<RelativeValuation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/valuation?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: RelativeValuation) => !cancelled && setRv(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Hidden for assets without a peer group.
  if (!loading && rv && !rv.available) return null;
  if (loading && !rv) return null;
  if (!rv || !rv.available || !rv.self) return null;

  const rows = [rv.self, ...rv.peers];
  const prem = (p: number | undefined) =>
    p == null ? null : (
      <span className={p >= 0 ? "text-down" : "text-up"}>
        {p >= 0 ? "+" : ""}
        {p.toFixed(0)}%
      </span>
    );

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          ⚖️{" "}
          <InfoTip text="Membandingkan valuasi saham ini dengan median saham sejenis. P/E rendah relatif = lebih murah; tinggi relatif = lebih mahal. Premium bisa wajar bila kualitas/pertumbuhan lebih unggul.">
            Valuasi vs Sejenis
          </InfoTip>
        </h2>
        {rv.verdict && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdictStyle(rv.verdict)}`}>
            Relatif {rv.verdict}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Grup: {rv.groupLabel}
      </p>

      {rv.mock && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Angka contoh (mock) — sumber live terbatas di lingkungan ini.
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="py-1.5 pr-3 text-left font-medium">Saham</th>
              <th className="px-3 py-1.5 text-right font-medium">
                <InfoTip text="Price-to-Earnings: harga dibagi laba per saham. Makin tinggi = pasar membayar lebih mahal per rupiah laba.">
                  P/E
                </InfoTip>
              </th>
              <th className="px-3 py-1.5 text-right font-medium">
                <InfoTip text="Price-to-Book: harga dibagi nilai buku ekuitas per saham.">P/B</InfoTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.symbol}
                className={`border-t border-slate-100 dark:border-slate-800 ${
                  p.isSelf ? "bg-brand/5 font-medium" : ""
                }`}
              >
                <td className="py-1.5 pr-3 text-left">
                  {p.short}
                  {p.isSelf && <span className="ml-1 text-[10px] text-brand">ini</span>}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(p.trailingPE)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(p.priceToBook)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <td className="py-1.5 pr-3 text-left text-xs">Median peer</td>
              <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                {num(rv.peerMedianPE)} {prem(rv.pePremiumPct)}
              </td>
              <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                {num(rv.peerMedianPB)} {prem(rv.pbPremiumPct)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Pembanding dari katalog aplikasi (bukan seluruh sektor). Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
