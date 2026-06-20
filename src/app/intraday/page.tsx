"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IntradayRow, IntradayScreen } from "@/lib/intraday-screener";
import { formatPrice } from "@/lib/format";

type SortKey = "score" | "gain" | "lose" | "vol";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Momentum" },
  { key: "gain", label: "Top Gainer" },
  { key: "lose", label: "Top Loser" },
  { key: "vol", label: "Volume" },
];

function pct(v: number | undefined, sign = true): string {
  if (v == null) return "–";
  const s = sign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

export default function IntradayPage() {
  const [data, setData] = useState<IntradayScreen | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");

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

  const rows = useMemo(() => {
    const r = [...(data?.rows ?? [])];
    if (sort === "gain") r.sort((a, b) => (b.changePct ?? -1e9) - (a.changePct ?? -1e9));
    else if (sort === "lose") r.sort((a, b) => (a.changePct ?? 1e9) - (b.changePct ?? 1e9));
    else if (sort === "vol") r.sort((a, b) => (b.relVol ?? 0) - (a.relVol ?? 0));
    else r.sort((a, b) => b.score - a.score);
    return r;
  }, [data, sort]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Momentum Intraday (IDX)</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pemindai saham IDX likuid: perubahan harian, volume relatif, posisi terhadap VWAP &amp;
          rentang hari. Untuk persiapan, bukan eksekusi.
        </p>
      </div>

      <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
        ⚠️ Data intraday Yahoo bisa telat ~15-20 menit dan tanpa order book. Trading harian berisiko
        tinggi — edukatif, bukan saran investasi.
      </div>

      {data?.mock && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          Sebagian/semua data adalah contoh (mock) — sumber live belum dapat diakses dari lingkungan ini.
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                sort === s.key
                  ? "bg-brand text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm">
          {loading ? "Memuat…" : "↻ Perbarui"}
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">Memindai saham IDX…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">Tidak ada data.</div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Saham</th>
                <th className="px-3 py-3 text-right font-medium">Terakhir</th>
                <th className="px-3 py-3 text-right font-medium">% Hari</th>
                <th className="px-3 py-3 text-right font-medium" title="Volume hari ini vs rata-rata harian (terakumulasi sepanjang hari)">RelVol</th>
                <th className="px-3 py-3 text-center font-medium">vs VWAP</th>
                <th className="px-3 py-3 text-right font-medium" title="Posisi harga dalam rentang hari (0% = low, 100% = high)">Posisi</th>
                <th className="px-3 py-3 text-right font-medium">Skor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <Row key={r.symbol} r={r} rank={i + 1} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ r, rank }: { r: IntradayRow; rank: number }) {
  const up = (r.changePct ?? 0) >= 0;
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="px-3 py-2 text-slate-400 dark:text-slate-500 tabular-nums">{rank}</td>
      <td className="px-3 py-2">
        <Link href={`/asset/${encodeURIComponent(r.symbol)}`} className="font-medium hover:text-brand">
          {r.name}
        </Link>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{r.last != null ? formatPrice(r.last, r.currency) : "–"}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${up ? "text-up" : "text-down"}`}>{pct(r.changePct)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{r.relVol != null ? `${r.relVol.toFixed(2)}×` : "–"}</td>
      <td className="px-3 py-2 text-center">
        {r.aboveVwap === undefined ? (
          <span className="text-slate-300 dark:text-slate-600">–</span>
        ) : (
          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${r.aboveVwap ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
            {r.aboveVwap ? "Atas" : "Bawah"}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{r.rangePos != null ? `${(r.rangePos * 100).toFixed(0)}%` : "–"}</td>
      <td className="px-3 py-2 text-right">
        <span className="inline-block rounded bg-brand/10 px-2 py-0.5 font-semibold text-brand tabular-nums">{r.score}</span>
      </td>
    </tr>
  );
}
