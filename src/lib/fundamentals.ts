const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface Fundamentals {
  available: boolean;
  sector?: string;
  industry?: string;
  country?: string;
  summary?: string;
  /** Key ratios/metrics as label -> formatted value. */
  metrics: { label: string; value: string }[];
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
  for (const host of HOSTS) {
    try {
      const url = `${host}/v10/finance/quoteSummary/${encodeURIComponent(
        symbol,
      )}?modules=${modules}`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (!result) continue;

      const sd = result.summaryDetail ?? {};
      const ks = result.defaultKeyStatistics ?? {};
      const fd = result.financialData ?? {};
      const ap = result.assetProfile ?? {};

      const metrics: { label: string; value: string }[] = [];
      const push = (label: string, v: string | null) => {
        if (v != null) metrics.push({ label, value: v });
      };

      push("P/E (trailing)", fmtNum(raw(sd.trailingPE)));
      push("P/E (forward)", fmtNum(raw(sd.forwardPE) ?? raw(ks.forwardPE)));
      push("PEG", fmtNum(raw(ks.pegRatio)));
      push("P/B", fmtNum(raw(ks.priceToBook)));
      push("Kapitalisasi pasar", fmtNum(raw(sd.marketCap) ?? raw(ks.enterpriseValue), { money: true }));
      push("Margin laba", fmtNum(raw(ks.profitMargins) ?? raw(fd.profitMargins), { pct: true }));
      push("ROE", fmtNum(raw(fd.returnOnEquity), { pct: true }));
      push("Pertumbuhan pendapatan", fmtNum(raw(fd.revenueGrowth), { pct: true }));
      push("Pertumbuhan laba", fmtNum(raw(fd.earningsGrowth), { pct: true }));
      push("Debt/Equity", fmtNum(raw(fd.debtToEquity)));
      push("Dividend yield", fmtNum(raw(sd.dividendYield), { pct: true }));
      push("Beta", fmtNum(raw(sd.beta) ?? raw(ks.beta)));

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
