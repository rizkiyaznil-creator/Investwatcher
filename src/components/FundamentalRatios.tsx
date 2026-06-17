"use client";

import { useEffect, useState } from "react";
import type { Fundamentals } from "@/lib/fundamentals";
import { formatPrice } from "@/lib/format";
import InfoTip from "./InfoTip";

const TIPS: Record<string, string> = {
  "P/E (trailing)": "Price-to-Earnings: harga dibagi laba per saham 12 bulan terakhir. Makin tinggi = pasar membayar lebih mahal per rupiah laba.",
  "P/E (forward)": "P/E berdasarkan perkiraan laba ke depan. Lebih rendah dari trailing berarti laba diperkirakan tumbuh.",
  PEG: "P/E dibagi pertumbuhan laba. ~1 dianggap wajar; <1 relatif murah terhadap pertumbuhan; >2 mahal.",
  "P/B": "Price-to-Book: harga dibagi nilai buku ekuitas per saham. <1 bisa berarti diperdagangkan di bawah nilai buku.",
  "Kapitalisasi pasar": "Nilai total seluruh saham perusahaan (harga × jumlah saham).",
  ROE: "Return on Equity: laba bersih dibagi ekuitas. Mengukur seberapa efisien modal pemegang saham menghasilkan laba.",
  "Margin laba": "Porsi pendapatan yang menjadi laba bersih. Makin tinggi makin profitabel.",
  "Pertumbuhan pendapatan": "Pertumbuhan pendapatan dibanding periode sebelumnya.",
  "Pertumbuhan laba": "Pertumbuhan laba dibanding periode sebelumnya.",
  "Debt/Equity": "Rasio utang terhadap ekuitas. Makin tinggi = makin banyak utang relatif terhadap modal (risiko lebih besar).",
  "Dividend yield": "Dividen tahunan dibagi harga saham — perkiraan imbal hasil dari dividen saja.",
  Beta: "Sensitivitas harga terhadap pasar. >1 lebih fluktuatif dari pasar, <1 lebih stabil.",
};

const GROUPS: { title: string; labels: string[] }[] = [
  { title: "Valuasi", labels: ["P/E (trailing)", "P/E (forward)", "PEG", "P/B", "Kapitalisasi pasar"] },
  { title: "Profitabilitas & Pertumbuhan", labels: ["ROE", "Margin laba", "Pertumbuhan pendapatan", "Pertumbuhan laba"] },
  { title: "Risiko & Lainnya", labels: ["Debt/Equity", "Dividend yield", "Beta"] },
];

const REC_LABEL: Record<string, string> = {
  strong_buy: "Beli Kuat",
  buy: "Beli",
  hold: "Tahan",
  underperform: "Kurangi",
  sell: "Jual",
};

function Stat({ label, value }: { label: string; value: string }) {
  const tip = TIPS[label];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {tip ? <InfoTip text={tip}>{label}</InfoTip> : label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function FundamentalRatios({
  symbol,
  currentPrice,
  currency,
}: {
  symbol: string;
  currentPrice?: number;
  currency?: string;
}) {
  const [f, setF] = useState<Fundamentals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: Fundamentals) => !cancelled && setF(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading && !f) return null;
  if (!f || !f.available) return null;

  const map = new Map(f.metrics.map((m) => [m.label, m.value]));
  const cur = currency ?? f.analyst?.currency ?? "USD";
  const target = f.analyst?.targetMean;
  const upside = target && currentPrice && currentPrice > 0 ? (target / currentPrice - 1) * 100 : undefined;
  const rec = f.analyst?.recommendation ? REC_LABEL[f.analyst.recommendation] : undefined;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          📊{" "}
          <InfoTip text="Rasio valuasi dan kesehatan fundamental perusahaan dari laporan keuangan terkini.">
            Valuasi &amp; Fundamental
          </InfoTip>
        </h2>
        {(f.sector || f.industry) && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {[f.sector, f.industry].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      {/* Analyst target */}
      {(target != null || rec) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-brand/5 px-3 py-2.5">
          {target != null && (
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <InfoTip text="Rata-rata target harga 12 bulan menurut analis yang meliput saham ini.">
                  Target analis
                </InfoTip>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatPrice(target, cur)}
                {upside != null && (
                  <span className={`ml-2 text-xs ${upside >= 0 ? "text-up" : "text-down"}`}>
                    {upside >= 0 ? "+" : ""}
                    {upside.toFixed(0)}% dari harga kini
                  </span>
                )}
              </div>
            </div>
          )}
          {rec && (
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Rekomendasi analis</div>
              <div className="text-sm font-semibold">{rec}</div>
            </div>
          )}
        </div>
      )}

      {/* Grouped ratios */}
      <div className="mt-4 space-y-4">
        {GROUPS.map((g) => {
          const items = g.labels.filter((l) => map.has(l));
          if (items.length === 0) return null;
          return (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {g.title}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {items.map((l) => (
                  <Stat key={l} label={l} value={map.get(l)!} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Data dari sumber pihak ketiga (Yahoo), bisa telat/berbeda dari laporan resmi. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
