import { getAsset } from "./assets";
import { universeFor, type Market } from "./screener-universe";
import { yahooQuoteSummary } from "./yahoo-fetch";

export type Style = "balanced" | "deepvalue" | "garp";

export interface Snapshot {
  symbol: string;
  name: string;
  market: "us" | "id";
  sector?: string;
  price?: number;
  currency?: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  pegRatio?: number;
  dividendYield?: number; // fraction
  profitMargins?: number; // fraction
  returnOnEquity?: number; // fraction
  revenueGrowth?: number; // fraction
  earningsGrowth?: number; // fraction
  debtToEquity?: number; // percent (e.g. 150 = 1.5x)
  targetMeanPrice?: number;
  recommendationKey?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  mock?: boolean;
}

export interface ScoredStock extends Snapshot {
  score: number; // 0-100 composite
  valueScore: number; // 0-100
  qualityScore: number; // 0-100
  upsideScore: number; // 0-100
  analystUpsidePct?: number;
  rangePos?: number; // 0-100 within 52w
  pe?: number; // the P/E used (forward preferred)
  reasons: string[];
}

export interface ScreenerResult {
  available: boolean;
  market: Market;
  style: Style;
  mock?: boolean;
  scanned: number;
  results: ScoredStock[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function raw(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

const MODULES = "summaryDetail,defaultKeyStatistics,financialData,price,assetProfile";

async function fetchSnapshot(symbol: string): Promise<Snapshot | null> {
  const market: "us" | "id" = symbol.endsWith(".JK") ? "id" : "us";
  {
    try {
      const r = await yahooQuoteSummary(symbol, MODULES, 43200); // 12h
      if (r) {
      const sd = r.summaryDetail ?? {};
      const ks = r.defaultKeyStatistics ?? {};
      const fd = r.financialData ?? {};
      const pr = r.price ?? {};
      const ap = r.assetProfile ?? {};
      return {
        symbol,
        name: getAsset(symbol)?.short ?? pr.shortName ?? pr.longName ?? symbol,
        market,
        sector: ap.sector,
        price: raw(fd.currentPrice) ?? raw(pr.regularMarketPrice) ?? raw(sd.previousClose),
        currency: pr.currency ?? (market === "id" ? "IDR" : "USD"),
        marketCap: raw(sd.marketCap) ?? raw(pr.marketCap),
        trailingPE: raw(sd.trailingPE),
        forwardPE: raw(sd.forwardPE) ?? raw(ks.forwardPE),
        priceToBook: raw(ks.priceToBook),
        pegRatio: raw(ks.pegRatio),
        dividendYield: raw(sd.dividendYield) ?? raw(sd.trailingAnnualDividendYield),
        profitMargins: raw(ks.profitMargins) ?? raw(fd.profitMargins),
        returnOnEquity: raw(fd.returnOnEquity),
        revenueGrowth: raw(fd.revenueGrowth),
        earningsGrowth: raw(fd.earningsGrowth) ?? raw(ks.earningsQuarterlyGrowth),
        debtToEquity: raw(fd.debtToEquity),
        targetMeanPrice: raw(fd.targetMeanPrice),
        recommendationKey: fd.recommendationKey,
        fiftyTwoWeekHigh: raw(sd.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: raw(sd.fiftyTwoWeekLow),
      };
      }
    } catch {
      // fall through
    }
  }
  return null;
}

// ---- scoring helpers ----
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
/** Lower value is better: good→1, bad→0. */
function lower(v: number | undefined, good: number, bad: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return clamp01((bad - v) / (bad - good));
}
/** Higher value is better: bad→0, good→1. */
function higher(v: number | undefined, bad: number, good: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return clamp01((v - bad) / (good - bad));
}
function weightedMean(pairs: [number | null, number][]): number | null {
  let sum = 0;
  let w = 0;
  for (const [s, wt] of pairs) {
    if (s == null) continue;
    sum += s * wt;
    w += wt;
  }
  return w === 0 ? null : sum / w;
}
function recScore(key?: string): number | null {
  switch (key) {
    case "strong_buy":
      return 1;
    case "buy":
      return 0.8;
    case "hold":
      return 0.5;
    case "underperform":
      return 0.25;
    case "sell":
      return 0;
    default:
      return null;
  }
}

const STYLE_WEIGHTS: Record<Style, { value: number; quality: number; upside: number }> = {
  balanced: { value: 0.4, quality: 0.35, upside: 0.25 },
  deepvalue: { value: 0.65, quality: 0.2, upside: 0.15 },
  garp: { value: 0.3, quality: 0.45, upside: 0.25 },
};

export function scoreStock(s: Snapshot, style: Style): ScoredStock | null {
  const pe = s.forwardPE && s.forwardPE > 0 ? s.forwardPE : s.trailingPE && s.trailingPE > 0 ? s.trailingPE : undefined;
  const analystUpsidePct =
    s.targetMeanPrice && s.price && s.price > 0 ? (s.targetMeanPrice / s.price - 1) * 100 : undefined;
  const rangePos =
    s.fiftyTwoWeekHigh != null && s.fiftyTwoWeekLow != null && s.price != null && s.fiftyTwoWeekHigh > s.fiftyTwoWeekLow
      ? ((s.price - s.fiftyTwoWeekLow) / (s.fiftyTwoWeekHigh - s.fiftyTwoWeekLow)) * 100
      : undefined;

  // Sub-scores (0-1)
  const value = weightedMean([
    [lower(pe, 10, 30), 0.4],
    [lower(s.priceToBook, 1, 5), 0.25],
    [s.pegRatio && s.pegRatio > 0 ? lower(s.pegRatio, 1, 3) : null, 0.25],
    [higher(s.dividendYield != null ? s.dividendYield * 100 : undefined, 0, 5), 0.1],
  ]);
  const quality = weightedMean([
    [higher(s.returnOnEquity != null ? s.returnOnEquity * 100 : undefined, 5, 25), 0.3],
    [higher(s.profitMargins != null ? s.profitMargins * 100 : undefined, 3, 25), 0.25],
    [higher(s.revenueGrowth != null ? s.revenueGrowth * 100 : undefined, 0, 20), 0.15],
    [higher(s.earningsGrowth != null ? s.earningsGrowth * 100 : undefined, 0, 25), 0.15],
    [lower(s.debtToEquity, 40, 200), 0.15],
  ]);
  const upside = weightedMean([
    [higher(analystUpsidePct, 0, 30), 0.45],
    [lower(rangePos, 20, 90), 0.3],
    [recScore(s.recommendationKey), 0.25],
  ]);

  // Need at least some valuation signal to be eligible.
  if (value == null) return null;

  const w = STYLE_WEIGHTS[style];
  const composite = weightedMean([
    [value, w.value],
    [quality, w.quality],
    [upside, w.upside],
  ]);
  if (composite == null) return null;

  const reasons = buildReasons(s, pe, analystUpsidePct, rangePos);

  return {
    ...s,
    pe,
    analystUpsidePct,
    rangePos,
    valueScore: Math.round((value ?? 0) * 100),
    qualityScore: Math.round((quality ?? 0) * 100),
    upsideScore: Math.round((upside ?? 0) * 100),
    score: Math.round(composite * 100),
    reasons,
  };
}

function buildReasons(s: Snapshot, pe?: number, upside?: number, rangePos?: number): string[] {
  const cand: { ok: boolean; text: string }[] = [
    { ok: pe != null && pe < 12, text: `P/E rendah (${pe?.toFixed(1)})` },
    { ok: s.priceToBook != null && s.priceToBook < 1.5, text: `P/B rendah (${s.priceToBook?.toFixed(1)})` },
    { ok: s.pegRatio != null && s.pegRatio > 0 && s.pegRatio < 1, text: `PEG < 1 (${s.pegRatio?.toFixed(2)})` },
    { ok: s.returnOnEquity != null && s.returnOnEquity > 0.15, text: `ROE tinggi (${((s.returnOnEquity ?? 0) * 100).toFixed(0)}%)` },
    { ok: s.profitMargins != null && s.profitMargins > 0.15, text: `Margin sehat (${((s.profitMargins ?? 0) * 100).toFixed(0)}%)` },
    { ok: s.earningsGrowth != null && s.earningsGrowth > 0.1, text: `Laba tumbuh (${((s.earningsGrowth ?? 0) * 100).toFixed(0)}%)` },
    { ok: upside != null && upside > 15, text: `Potensi +${(upside ?? 0).toFixed(0)}% ke target analis` },
    { ok: rangePos != null && rangePos < 30, text: `Dekat dasar 52mg` },
    { ok: s.dividendYield != null && s.dividendYield > 0.04, text: `Dividend yield ${((s.dividendYield ?? 0) * 100).toFixed(1)}%` },
  ];
  return cand.filter((c) => c.ok).map((c) => c.text).slice(0, 4);
}

/** Run callbacks with limited concurrency. */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runScreener(market: Market, style: Style, limit = 30): Promise<ScreenerResult> {
  const symbols = universeFor(market);
  const snaps = await pool(symbols, 8, fetchSnapshot);

  let usable = snaps.filter((s): s is Snapshot => s != null);
  let mock = false;
  if (usable.length === 0) {
    // Sandbox / egress blocked → deterministic mock universe.
    usable = symbols.map(mockSnapshot);
    mock = true;
  }

  const scored = usable
    .map((s) => scoreStock({ ...s, mock }, style))
    .filter((s): s is ScoredStock => s != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { available: scored.length > 0, market, style, mock, scanned: usable.length, results: scored };
}

/** Fetch + score a specific set of symbols (used for AI thesis on top picks). */
export async function screenSymbols(symbols: string[], style: Style): Promise<ScoredStock[]> {
  const snaps = await pool(symbols, 8, fetchSnapshot);
  return symbols
    .map((sym, i) => {
      const s = snaps[i] ?? mockSnapshot(sym);
      return scoreStock(s, style);
    })
    .filter((s): s is ScoredStock => s != null);
}

/** Deterministic mock snapshot for offline/sandbox use. */
export function mockSnapshot(symbol: string): Snapshot {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const market: "us" | "id" = symbol.endsWith(".JK") ? "id" : "us";
  const idr = market === "id";
  const price = idr ? 500 + rng() * 12000 : 30 + rng() * 600;
  return {
    symbol,
    name: getAsset(symbol)?.short ?? symbol.replace(".JK", ""),
    market,
    sector: ["Keuangan", "Teknologi", "Energi", "Konsumer", "Industri"][Math.floor(rng() * 5)],
    price,
    currency: idr ? "IDR" : "USD",
    marketCap: (idr ? 1e12 : 1e10) * (1 + rng() * 50),
    trailingPE: 5 + rng() * 30,
    forwardPE: 5 + rng() * 25,
    priceToBook: 0.6 + rng() * 5,
    pegRatio: 0.4 + rng() * 3,
    dividendYield: rng() * 0.06,
    profitMargins: rng() * 0.3,
    returnOnEquity: rng() * 0.3,
    revenueGrowth: rng() * 0.3 - 0.05,
    earningsGrowth: rng() * 0.4 - 0.1,
    debtToEquity: rng() * 200,
    targetMeanPrice: price * (0.85 + rng() * 0.5),
    recommendationKey: ["strong_buy", "buy", "hold", "buy", "hold"][Math.floor(rng() * 5)],
    fiftyTwoWeekHigh: price * (1.05 + rng() * 0.6),
    fiftyTwoWeekLow: price * (0.4 + rng() * 0.4),
    mock: true,
  };
}

/** Compact line for AI thesis evidence. */
export function snapshotLine(s: ScoredStock): string {
  const f = (n?: number) => (n == null ? "n/a" : n.toFixed(1));
  const p = (n?: number) => (n == null ? "n/a" : `${(n * 100).toFixed(0)}%`);
  return [
    `${s.symbol} (${s.name}, ${s.sector ?? "?"})`,
    `skor ${s.score} [value ${s.valueScore}/quality ${s.qualityScore}/upside ${s.upsideScore}]`,
    `P/E ${f(s.pe)}`,
    `P/B ${f(s.priceToBook)}`,
    `PEG ${f(s.pegRatio)}`,
    `ROE ${p(s.returnOnEquity)}`,
    `margin ${p(s.profitMargins)}`,
    `pertumbuhan laba ${p(s.earningsGrowth)}`,
    s.analystUpsidePct != null ? `upside analis ${s.analystUpsidePct.toFixed(0)}%` : "upside analis n/a",
    s.rangePos != null ? `posisi 52mg ${s.rangePos.toFixed(0)}%` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
