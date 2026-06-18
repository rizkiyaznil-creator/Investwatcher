import { yahooQuoteSummary } from "./yahoo-fetch";

export interface Fundamentals {
  available: boolean;
  sector?: string;
  industry?: string;
  country?: string;
  summary?: string;
  /** Key ratios/metrics as label -> formatted value (+ raw number for comparison). */
  metrics: { label: string; value: string; num?: number }[];
  analyst?: {
    recommendation?: string;
    targetMean?: number;
    currency?: string;
  };
}

function fmtNum(n: number | undefined, opts: { pct?: boolean; money?: boolean } = {}): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (opts.pct) return `${(n * 100).toFixed(1)}%`;
  if (opts.money) {
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)} Jt`;
    return n.toLocaleString("en-US");
  }
  return n.toFixed(2);
}

function raw(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

/** Best-effort fundamentals from Yahoo quoteSummary. Empty when unavailable. */
export async function getFundamentals(symbol: string): Promise<Fundamentals> {
  const modules =
    "summaryDetail,defaultKeyStatistics,financialData,assetProfile";
  {
    try {
      const result = await yahooQuoteSummary(symbol, modules, 3600);
      if (!result) return { available: false, metrics: [] };

      const sd = result.summaryDetail ?? {};
      const ks = result.defaultKeyStatistics ?? {};
      const fd = result.financialData ?? {};
      const ap = result.assetProfile ?? {};

      const metrics: { label: string; value: string; num?: number }[] = [];
      const push = (label: string, n: number | undefined, opts: { pct?: boolean; money?: boolean } = {}) => {
        const v = fmtNum(n, opts);
        if (v != null) metrics.push({ label, value: v, num: n });
      };

      push("P/E (trailing)", raw(sd.trailingPE));
      push("P/E (forward)", raw(sd.forwardPE) ?? raw(ks.forwardPE));
      push("PEG", raw(ks.pegRatio));
      push("P/B", raw(ks.priceToBook));
      push("Kapitalisasi pasar", raw(sd.marketCap) ?? raw(ks.enterpriseValue), { money: true });
      push("Margin laba", raw(ks.profitMargins) ?? raw(fd.profitMargins), { pct: true });
      push("ROE", raw(fd.returnOnEquity), { pct: true });
      push("Pertumbuhan pendapatan", raw(fd.revenueGrowth), { pct: true });
      push("Pertumbuhan laba", raw(fd.earningsGrowth), { pct: true });
      push("Debt/Equity", raw(fd.debtToEquity));
      push("Dividend yield", raw(sd.dividendYield), { pct: true });
      push("Beta", raw(sd.beta) ?? raw(ks.beta));

      const analyst = {
        recommendation: fd.recommendationKey as string | undefined,
        targetMean: raw(fd.targetMeanPrice),
        currency: (fd.financialCurrency as string | undefined) ?? undefined,
      };

      return {
        available: metrics.length > 0 || !!ap.sector,
        sector: ap.sector,
        industry: ap.industry,
        country: ap.country,
        summary:
          typeof ap.longBusinessSummary === "string"
            ? ap.longBusinessSummary.slice(0, 600)
            : undefined,
        metrics,
        analyst:
          analyst.recommendation || analyst.targetMean ? analyst : undefined,
      };
    } catch {
      // try next host
    }
  }
  return { available: false, metrics: [] };
}
