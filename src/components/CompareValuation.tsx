"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Fundamentals } from "@/lib/fundamentals";
import type { Quote } from "@/lib/types";
import { useCatalog } from "@/components/CatalogContext";
import { formatPrice } from "@/lib/format";
import InfoTip from "./InfoTip";

const TIPS: Record<string, string> = {
  "Harga kini": "Harga pasar terkini per saham.",
  "Target analis": "Rata-rata target harga 12 bulan menurut analis yang meliput saham.",
  Upside: "Potensi kenaikan/penurunan dari harga kini menuju target analis.",
  Rekomendasi: "Konsensus rekomendasi analis.",
  "P/E (trailing)": "Harga dibagi laba per saham 12 bulan terakhir. Makin rendah relatif murah.",
  "P/E (forward)": "P/E berdasarkan perkiraan laba ke depan.",
  PEG: "P/E dibagi pertumbuhan laba. ~1 wajar; <1 murah relatif terhadap pertumbuhan.",
  "P/B": "Harga dibagi nilai buku ekuitas per saham. <1 di bawah nilai buku.",
  "Kapitalisasi pasar": "Nilai total seluruh saham (harga x jumlah saham).",
  ROE: "Return on Equity: laba bersih dibagi ekuitas. Makin tinggi makin efisien.",
  "Margin laba": "Porsi pendapatan yang menjadi laba bersih.",
  "Pertumbuhan pendapatan": "Pertumbuhan pendapatan dibanding periode sebelumnya.",
  "Pertumbuhan laba": "Pertumbuhan laba dibanding periode sebelumnya.",
  "Debt/Equity": "Rasio utang terhadap ekuitas. Makin rendah makin sedikit utang (risiko lebih kecil).",
  "Dividend yield": "Dividen tahunan dibagi harga saham.",
  Beta: "Sensitivitas harga terhadap pasar. >1 lebih fluktuatif.",
};

const REC_LABEL: Record<string, string> = {
  strong_buy: "Beli Kuat",
  buy: "Beli",
  hold: "Tahan",
  underperform: "Kurangi",
  sell: "Jual",
};

// Direction for highlighting the best cell per row. Currency-bound rows are
// neutral because cross-currency comparison (IDR vs USD) is meaningless.
type Dir = "low" | "high" | "none";
const METRIC_ROWS: { label: string; dir: Dir }[] = [
  { label: "P/E (trailing)", dir: "low" },
  { label: "P/E (forward)", dir: "low" },
  { label: "PEG", dir: "low" },
  { label: "P/B", dir: "low" },
  { label: "Kapitalisasi pasar", dir: "none" },
  { label: "ROE", dir: "high" },
  { label: "Margin laba", dir: "high" },
  { label: "Pertumbuhan pendapatan", dir: "high" },
  { label: "Pertumbuhan laba", dir: "high" },
  { label: "Debt/Equity", dir: "low" },
  { label: "Dividend yield", dir: "high" },
  { label: "Beta", dir: "none" },
];

interface Col {
  symbol: string;
  short: string;
  icon?: string;
  fund?: Fundamentals;
  quote?: Quote;
}

export default function CompareValuation({ symbols }: { symbols: string[] }) {
  const { resolve } = useCatalog();
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbols.length === 0) {
      setCols([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      Promise.all(
        symbols.map((s) =>
          fetch(`/api/fundamentals?symbol=${encodeURIComponent(s)}`)
            .then((r) => r.json())
            .then((d: Fundamentals) => ({ s, d }))
            .catch(() => ({ s, d: { available: false, metrics: [] } as Fundamentals })),
        ),
      ),
      fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`)
        .then((r) => r.json())
        .then((d: { quotes: Quote[] }) => d.quotes ?? [])
        .catch(() => [] as Quote[]),
    ]).then(([funds, quotes]) => {
      if (cancelled) return;
      const qmap = new Map(quotes.map((q) => [q.symbol, q]));
      const next: Col[] = symbols.map((sym) => {
        const a = resolve(sym);
        const fd = funds.find((f) => f.s === sym)?.d;
        return {
          symbol: sym,
          short: a.short,
          icon: a.icon,
          fund: fd?.available ? fd : undefined,
          quote: qmap.get(sym),
        };
      });
      setCols(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [symbols, resolve]);

  if (symbols.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500 dark:text-slate-400">
        Pilih emiten (saham) di bawah untuk membandingkan valuasinya.
      </div>
    );
  }

  if (loading && cols.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500 dark:text-slate-400">
        Memuat data fundamental…
      </div>
    );
  }

  const withData = cols.filter((c) => c.fund || c.quote);
  if (withData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Data fundamental belum tersedia untuk emiten terpilih (sumber live belum dapat diakses dari
        lingkungan ini).
      </div>
    );
  }

  // Precompute the "best" value index per metric row for highlighting.
  const bestForRow = (label: string, dir: Dir): number | null => {
    if (dir === "none") return null;
    let bestIdx: number | null = null;
    let bestVal = dir === "low" ? Infinity : -Infinity;
    let count = 0;
    withData.forEach((c, i) => {
      const m = c.fund?.metrics.find((x) => x.label === label);
      if (m?.num == null || !Number.isFinite(m.num)) return;
      if (dir === "low" && m.num <= 0) return; // negative/zero P/E etc. not meaningful
      count++;
      if ((dir === "low" && m.num < bestVal) || (dir === "high" && m.num > bestVal)) {
        bestVal = m.num;
        bestIdx = i;
      }
    });
    return count >= 2 ? bestIdx : null;
  };

  const cellVal = (c: Col, label: string): string =>
    c.fund?.metrics.find((x) => x.label === label)?.value ?? "–";

  // Upside row data
  const upsides = withData.map((c) => {
    const t = c.fund?.analyst?.targetMean;
    const p = c.quote?.price;
    return t && p && p > 0 ? (t / p - 1) * 100 : null;
  });
  const bestUpside = (() => {
    let idx: number | null = null;
    let best = -Infinity;
    let count = 0;
    upsides.forEach((u, i) => {
      if (u == null) return;
      count++;
      if (u > best) {
        best = u;
        idx = i;
      }
    });
    return count >= 2 ? idx : null;
  })();

  const Th = ({ label }: { label: string }) => (
    <td className="whitespace-nowrap py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400">
      {TIPS[label] ? <InfoTip text={TIPS[label]}>{label}</InfoTip> : label}
    </td>
  );

  const hi = "bg-up/10 font-semibold text-up";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <td className="py-2 pr-3" />
            {withData.map((c) => (
              <td key={c.symbol} className="px-3 py-2 text-center">
                <Link
                  href={`/asset/${encodeURIComponent(c.symbol)}`}
                  className="font-semibold hover:text-brand"
                >
                  {c.icon} {c.short}
                </Link>
                {c.fund?.sector && (
                  <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {c.fund.sector}
                  </div>
                )}
              </td>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {/* Harga & analis */}
          <tr className="border-b border-slate-100 dark:border-slate-800/60">
            <Th label="Harga kini" />
            {withData.map((c) => (
              <td key={c.symbol} className="px-3 py-2 text-center">
                {c.quote ? formatPrice(c.quote.price, c.quote.currency) : "–"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800/60">
            <Th label="Target analis" />
            {withData.map((c) => (
              <td key={c.symbol} className="px-3 py-2 text-center">
                {c.fund?.analyst?.targetMean != null
                  ? formatPrice(
                      c.fund.analyst.targetMean,
                      c.quote?.currency ?? c.fund.analyst.currency ?? "USD",
                    )
                  : "–"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800/60">
            <Th label="Upside" />
            {withData.map((c, i) => {
              const u = upsides[i];
              return (
                <td
                  key={c.symbol}
                  className={`px-3 py-2 text-center ${bestUpside === i ? hi : ""}`}
                >
                  {u == null ? (
                    "–"
                  ) : (
                    <span className={bestUpside === i ? "" : u >= 0 ? "text-up" : "text-down"}>
                      {u >= 0 ? "+" : ""}
                      {u.toFixed(0)}%
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <Th label="Rekomendasi" />
            {withData.map((c) => (
              <td key={c.symbol} className="px-3 py-2 text-center">
                {c.fund?.analyst?.recommendation
                  ? REC_LABEL[c.fund.analyst.recommendation] ?? c.fund.analyst.recommendation
                  : "–"}
              </td>
            ))}
          </tr>

          {/* Rasio fundamental */}
          {METRIC_ROWS.map((row) => {
            const best = bestForRow(row.label, row.dir);
            return (
              <tr key={row.label} className="border-b border-slate-100 dark:border-slate-800/60">
                <Th label={row.label} />
                {withData.map((c, i) => (
                  <td
                    key={c.symbol}
                    className={`px-3 py-2 text-center ${best === i ? hi : ""}`}
                  >
                    {cellVal(c, row.label)}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Sektor */}
          <tr>
            <Th label="Sektor" />
            {withData.map((c) => (
              <td key={c.symbol} className="px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {c.fund?.sector ?? "–"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Sel <span className="rounded bg-up/10 px-1 text-up">hijau</span> = nilai terbaik per baris di
        antara emiten terpilih (P/E, PEG, P/B, D/E makin rendah makin baik; ROE, margin, pertumbuhan,
        yield, upside makin tinggi makin baik). Rasio % &amp; kelipatan dapat dibandingkan lintas mata
        uang; angka harga/kapitalisasi tidak. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
