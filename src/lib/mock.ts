import type { Candle, Quote, RangeKey } from "./types";
import { getAsset } from "./assets";

/**
 * Deterministic mock data generator. Used as a fallback whenever the live data
 * source (Yahoo Finance / Antam) is unreachable — e.g. when running inside a
 * sandbox whose network egress allowlist does not include those hosts.
 *
 * The data is generated from a seeded PRNG so a given symbol always produces the
 * same, plausible-looking price series. This keeps the UI fully functional for
 * development and demos; real values are used automatically once the network
 * allows the upstream hosts.
 */

// Plausible baseline prices per known symbol (in the asset's native currency).
const BASE_PRICE: Record<string, number> = {
  "GC=F": 2350,
  "SI=F": 29.5,
  "PL=F": 1000,
  "HG=F": 4.5,
  "CL=F": 78,
  "BZ=F": 82,
  "NG=F": 2.7,
  "ZC=F": 440,
  "ZW=F": 600,
  "KC=F": 230,
  "ANTAM-GOLD": 1_350_000,
  AAPL: 195,
  MSFT: 420,
  NVDA: 120,
  GOOGL: 175,
  AMZN: 185,
  TSLA: 180,
  "BBCA.JK": 9500,
  "BBRI.JK": 4500,
  "TLKM.JK": 3000,
  "ASII.JK": 4800,
  "ANTM.JK": 1500,
  "GOTO.JK": 60,
  "IDR=X": 16200,
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 seeded PRNG. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function baseFor(symbol: string): number {
  if (BASE_PRICE[symbol] != null) return BASE_PRICE[symbol];
  // Derive a stable baseline from the symbol hash for unknown symbols.
  const h = hashString(symbol);
  return 50 + (h % 500);
}

/** Volatility (daily std-dev as a fraction of price) per asset type. */
function volFor(symbol: string): number {
  const asset = getAsset(symbol);
  switch (asset?.type) {
    case "fx":
      return 0.004;
    case "gold_antam":
      return 0.008;
    case "commodity":
      return symbol === "NG=F" ? 0.03 : 0.014;
    case "stock_us":
      return symbol === "TSLA" || symbol === "NVDA" ? 0.03 : 0.018;
    case "stock_id":
      return 0.02;
    default:
      return 0.015;
  }
}

interface RangeSpec {
  points: number;
  stepSeconds: number;
  intraday: boolean;
}

export function rangeSpec(range: RangeKey): RangeSpec {
  switch (range) {
    case "1D":
      return { points: 78, stepSeconds: 5 * 60, intraday: true }; // ~6.5h of 5-min bars
    case "1W":
      return { points: 7 * 13, stepSeconds: 30 * 60, intraday: true };
    case "1M":
      return { points: 30, stepSeconds: 24 * 3600, intraday: false };
    case "3M":
      return { points: 90, stepSeconds: 24 * 3600, intraday: false };
    case "1Y":
      return { points: 260, stepSeconds: 24 * 3600, intraday: false };
    case "5Y":
      return { points: 260, stepSeconds: 7 * 24 * 3600, intraday: false };
  }
}

export function mockHistory(symbol: string, range: RangeKey): Candle[] {
  const spec = rangeSpec(range);
  const base = baseFor(symbol);
  const vol = volFor(symbol);
  // Seed couples symbol + range so each range looks internally consistent.
  const rng = makeRng(hashString(symbol + ":" + range));

  const now = Math.floor(Date.now() / 1000);
  const candles: Candle[] = [];
  // Start price drifts a bit below/above base so series ends near `base`.
  let price = base * (0.85 + rng() * 0.3);

  for (let i = spec.points - 1; i >= 0; i--) {
    const time = now - i * spec.stepSeconds;
    // Random walk with slight mean-reversion toward base.
    const shock = (rng() - 0.5) * 2 * vol;
    const reversion = (base - price) / base * 0.02;
    const open = price;
    price = Math.max(0.0001, price * (1 + shock + reversion));
    const close = price;
    const hi = Math.max(open, close) * (1 + rng() * vol * 0.5);
    const lo = Math.min(open, close) * (1 - rng() * vol * 0.5);
    const volume = Math.round((1 + rng()) * 1_000_000);
    candles.push({
      time,
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(close),
      volume,
    });
  }
  return candles;
}

function round(n: number): number {
  if (n >= 1000) return Math.round(n);
  if (n >= 10) return Math.round(n * 100) / 100;
  return Math.round(n * 10000) / 10000;
}

/** Deterministic daily series of `days` length, for analytics fallback. */
export function mockDailyHistory(symbol: string, days = 1300): Candle[] {
  const base = baseFor(symbol);
  const vol = volFor(symbol);
  const rng = makeRng(hashString(symbol + ":daily"));
  const now = Math.floor(Date.now() / 1000);
  const candles: Candle[] = [];
  let price = base * (0.6 + rng() * 0.3); // start lower so there is long-run growth
  for (let i = days - 1; i >= 0; i--) {
    const time = now - i * 24 * 3600;
    const shock = (rng() - 0.5) * 2 * vol;
    const drift = 0.0003; // mild upward drift
    const open = price;
    price = Math.max(0.0001, price * (1 + shock + drift));
    const close = price;
    const hi = Math.max(open, close) * (1 + rng() * vol * 0.5);
    const lo = Math.min(open, close) * (1 - rng() * vol * 0.5);
    candles.push({
      time,
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(close),
      volume: Math.round((1 + rng()) * 1_000_000),
    });
  }
  return candles;
}

export function mockQuote(symbol: string): Quote {
  const candles = mockHistory(symbol, "1M");
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  const yearCandles = mockHistory(symbol, "1Y");
  const closes = yearCandles.map((c) => c.close);
  const high52 = Math.max(...closes);
  const low52 = Math.min(...closes);
  const asset = getAsset(symbol);

  const price = last.close;
  const previousClose = prev.close;
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  const quote: Quote = {
    symbol,
    price,
    previousClose,
    change: round(change),
    changePercent: Math.round(changePercent * 100) / 100,
    currency: asset?.currency ?? "USD",
    high52: round(high52),
    low52: round(low52),
    spark: candles.slice(-30).map((c) => c.close),
    marketTime: last.time,
    mock: true,
  };

  if (asset?.type === "gold_antam") {
    // Buyback is typically a few percent below sell price.
    const buyback = round(price * 0.92);
    quote.buyback = buyback;
    quote.spread = round(price - buyback);
  }

  return quote;
}
