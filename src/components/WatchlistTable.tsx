"use client";

import Link from "next/link";
import type { Quote } from "@/lib/types";
import { getAsset } from "@/lib/assets";
import {
  changeColor,
  formatPercent,
  formatPrice,
  rangePosition,
} from "@/lib/format";
import { useCurrency } from "./CurrencyContext";
import Sparkline from "./Sparkline";
import InfoTip from "./InfoTip";

interface Props {
  symbols: string[];
  quotes: Record<string, Quote>;
  loading: boolean;
  onRemove: (symbol: string) => void;
}

export default function WatchlistTable({
  symbols,
  quotes,
  loading,
  onRemove,
}: Props) {
  const { convert } = useCurrency();

  if (symbols.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">
        Watchlist kosong. Klik <span className="text-brand">“+ Tambah aset”</span>{" "}
        untuk mulai memantau.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Aset</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">
                <span className="inline-flex">
                  <InfoTip text="Perubahan harga dibanding penutupan hari perdagangan sebelumnya (persentase harian).">
                    Perubahan
                  </InfoTip>
                </span>
              </th>
              <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">
                <span className="inline-flex">
                  <InfoTip text="Grafik mini dari 30 harga terakhir untuk melihat arah pergerakan secara sekilas.">
                    Tren 30 titik
                  </InfoTip>
                </span>
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                <InfoTip
                  align="right"
                  text="Posisi harga sekarang di antara terendah (L) dan tertinggi (H) selama 52 minggu. 0% = paling murah, 100% = paling mahal dalam setahun."
                >
                  Posisi 52 minggu
                </InfoTip>
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const asset = getAsset(symbol);
              const q = quotes[symbol];
              const up = (q?.changePercent ?? 0) >= 0;
              const pos = q ? rangePosition(q) : null;
              const disp = q ? convert(q.price, q.currency) : null;

              return (
                <tr
                  key={symbol}
                  className="group border-b border-slate-200 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link href={`/asset/${encodeURIComponent(symbol)}`} className="flex items-center gap-2">
                      <span className="text-lg">{asset?.icon ?? "•"}</span>
                      <span>
                        <span className="block font-medium text-slate-800">
                          {asset?.short ?? symbol}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {asset?.name ?? symbol}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {disp ? (
                      formatPrice(disp.value, disp.currency)
                    ) : loading ? (
                      <span className="text-slate-400">…</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${q ? changeColor(q.changePercent) : ""}`}
                  >
                    {q ? formatPercent(q.changePercent) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex justify-center">
                      {q?.spark ? (
                        <Sparkline data={q.spark} up={up} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {pos != null ? (
                      <div className="w-40">
                        <div className="relative h-1.5 rounded-full bg-slate-200">
                          <div
                            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-brand"
                            style={{ left: `${pos}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                          <span>L</span>
                          <span>{pos.toFixed(0)}%</span>
                          <span>H</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemove(symbol)}
                      title="Hapus dari watchlist"
                      className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-down"
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
    </div>
  );
}
