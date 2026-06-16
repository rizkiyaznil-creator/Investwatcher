import type { Quote, Candle, RangeKey } from "./types";
import { mockHistory, mockQuote } from "./mock";
import { getStoredAntamCandles, latestStored } from "./antamStore";
import { getQuote, getHistory } from "./yahoo";

/**
 * Emas Antam (Logam Mulia) price source — strengthened with multiple fallbacks.
 *
 * Priority (most accurate first):
 *   1. Live scrape of public Antam price pages (harga-emas.org).
 *   2. Estimate derived from the LIVE world gold price (GC=F) converted to
 *      IDR/gram plus a typical Antam premium — always available wherever Yahoo
 *      works, keeps Antam current and consistent with world gold.
 *   3. Stored daily snapshots (data/antam-history.json), incl. seeded baseline.
 *   4. Deterministic mock series (last resort, e.g. fully offline sandbox).
 */

const ANTAM_SYMBOL = "ANTAM-GOLD";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const TROY_OZ_GRAMS = 31.1034768;
// Antam sells a few percent above spot; buyback sits below the sell price.
const SELL_PREMIUM = 1.04;
const BUYBACK_RATIO = 0.93;
// Sanity bounds for a per-gram IDR price, to reject garbage scrape matches.
const MIN_PER_GRAM = 700_000;
const MAX_PER_GRAM = 6_000_000;

function round500(n: number): number {
  return Math.round(n / 500) * 500;
}

interface AntamPrices {
  sell: number;
  buyback: number;
}

// --- Source 1: scrape harga-emas.org -------------------------------------

function extractRupiah(html: string, re: RegExp): number | null {
  const m = html.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= MIN_PER_GRAM && n <= MAX_PER_GRAM ? n : null;
}

async function scrapeHargaEmas(): Promise<AntamPrices | null> {
  try {
    const res = await fetch("https://harga-emas.org/", {
      headers: { "User-Agent": UA },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try several patterns; first plausible per-gram sell price wins.
    const sell =
      extractRupiah(html, /1\s*gram[^0-9]{0,60}([0-9.]{7,})/i) ??
      extractRupiah(html, /harga\s*dasar[^0-9]{0,60}([0-9.]{7,})/i) ??
      extractRupiah(html, /per\s*gram[^0-9]{0,60}([0-9.]{7,})/i);
    const buyback =
      extractRupiah(html, /buy\s*back[^0-9]{0,60}([0-9.]{7,})/i) ??
      extractRupiah(html, /beli\s*kembali[^0-9]{0,60}([0-9.]{7,})/i);

    if (sell) {
      return { sell, buyback: buyback ?? round500(sell * BUYBACK_RATIO) };
    }
    return null;
  } catch {
    return null;
  }
}

// --- Source 2: derive from live world gold -------------------------------

/** Returns the live USD/IDR rate and gold USD/oz, only if both are live. */
async function liveGoldAndFx(): Promise<{ goldUsd: number; rate: number } | null> {
  const [gold, fx] = await Promise.all([getQuote("GC=F"), getQuote("IDR=X")]);
  if (gold.mock || fx.mock || !gold.price || !fx.price) return null;
  return { goldUsd: gold.price, rate: fx.price };
}

function spotPerGramIdr(goldUsd: number, rate: number): number {
  return (goldUsd / TROY_OZ_GRAMS) * rate;
}

async function deriveFromGold(): Promise<AntamPrices | null> {
  const live = await liveGoldAndFx();
  if (!live) return null;
  const spot = spotPerGramIdr(live.goldUsd, live.rate);
  const sell = round500(spot * SELL_PREMIUM);
  return { sell, buyback: round500(sell * BUYBACK_RATIO) };
}

// --- Source 3: store snapshot --------------------------------------------

async function storedAsPrices(): Promise<AntamPrices | null> {
  const last = await latestStored();
  return last ? { sell: last.sell, buyback: last.buyback } : null;
}

// --- Public API ----------------------------------------------------------

export async function getAntamQuote(): Promise<Quote> {
  const scraped = await scrapeHargaEmas();
  const derived = scraped ? null : await deriveFromGold();
  const sourced = scraped ?? derived ?? (await storedAsPrices());
  if (!sourced) return mockQuote(ANTAM_SYMBOL);

  const { sell, buyback } = sourced;
  const base = mockQuote(ANTAM_SYMBOL); // for spark + 52w estimate fallback

  // Prefer a real previous close & 52w range from stored history when present.
  const stored = await getStoredAntamCandles("1Y");
  let previousClose = base.previousClose;
  let high52 = base.high52;
  let low52 = base.low52;
  let spark = base.spark;
  if (stored && stored.length >= 2) {
    previousClose = stored[stored.length - 2].close;
    const closes = stored.map((c) => c.close);
    high52 = Math.max(...closes, sell);
    low52 = Math.min(...closes, sell);
    spark = [...closes.slice(-29), sell];
  } else {
    previousClose = round500(sell * 0.999);
  }

  const change = sell - previousClose;
  return {
    symbol: ANTAM_SYMBOL,
    price: sell,
    previousClose,
    change: Math.round(change),
    changePercent: Math.round((change / previousClose) * 10000) / 100,
    currency: "IDR",
    high52,
    low52,
    spark,
    buyback,
    spread: sell - buyback,
    marketTime: Math.floor(Date.now() / 1000),
    mock: false,
    estimated: !scraped && !!derived,
    note:
      !scraped && derived
        ? "Estimasi dari harga emas dunia (spot + premium Antam ~4%)."
        : undefined,
  };
}

export async function getAntamHistory(
  range: RangeKey,
): Promise<{ candles: Candle[]; mock: boolean; estimated?: boolean }> {
  // Prefer real daily snapshots only when the store contains genuine (non-seed)
  // data. Otherwise derive from the live world-gold series so the chart stays
  // current and consistent with the quote, falling back to store/mock.
  const realSnapshots = await getRealSnapshotCandles(range);
  if (realSnapshots && realSnapshots.length >= 2) {
    return { candles: realSnapshots, mock: false };
  }

  const derived = await deriveHistoryFromGold(range);
  if (derived && derived.length >= 2) {
    return { candles: derived, mock: false, estimated: true };
  }

  const stored = await getStoredAntamCandles(range);
  if (stored && stored.length >= 2) return { candles: stored, mock: false };

  return { candles: mockHistory(ANTAM_SYMBOL, range), mock: true };
}

/** Stored candles, but only if the store holds real (non-seed) snapshots. */
async function getRealSnapshotCandles(range: RangeKey): Promise<Candle[] | null> {
  const { readStore } = await import("./antamStore");
  const store = await readStore();
  if (!store) return null;
  const hasReal = store.points.some((p) => (p as { source?: string }).source === "live");
  if (!hasReal) return null;
  return getStoredAntamCandles(range);
}

/** Build an Antam history series from the world-gold series converted to IDR. */
async function deriveHistoryFromGold(range: RangeKey): Promise<Candle[] | null> {
  const live = await liveGoldAndFx();
  if (!live) return null;
  const { candles, mock } = await getHistory("GC=F", range);
  if (mock || candles.length < 2) return null;

  const factor = (live.rate * SELL_PREMIUM) / TROY_OZ_GRAMS;
  return candles.map((c) => ({
    time: c.time,
    open: round500(c.open * factor),
    high: round500(c.high * factor),
    low: round500(c.low * factor),
    close: round500(c.close * factor),
  }));
}
