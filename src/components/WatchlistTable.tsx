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
      <div className="card p-10 text-center text-gray-400">
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
            <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-medium">Aset</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">Perubahan</th>
              <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">
                Tren 30 titik
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Posisi 52 minggu
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
                  className="group border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <Link href={`/asset/${encodeURIComponent(symbol)}`} className="flex items-center gap-2">
                      <span className="text-lg">{asset?.icon ?? "•"}</span>
                      <span>
                        <span className="block font-medium text-gray-100">
                          {asset?.short ?? symbol}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {asset?.name ?? symbol}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {disp ? (
                      formatPrice(disp.value, disp.currency)
                    ) : loading ? (
                      <span className="text-gray-600">…</span>
                    ) : (
                      <span className="text-gray-600">—</span>
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
                        <span className="text-gray-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {pos != null ? (
                      <div className="w-40">
                        <div className="relative h-1.5 rounded-full bg-gray-700">
                          <div
                            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-gray-900 bg-brand"
                            style={{ left: `${pos}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                          <span>L</span>
                          <span>{pos.toFixed(0)}%</span>
                          <span>H</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemove(symbol)}
                      title="Hapus dari watchlist"
                      className="text-gray-600 opacity-0 transition group-hover:opacity-100 hover:text-down"
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
