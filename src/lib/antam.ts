import type { Quote, Candle, RangeKey } from "./types";
import { mockHistory, mockQuote } from "./mock";
import { getStoredAntamCandles, latestStored } from "./antamStore";

/**
 * Emas Antam (Logam Mulia) price source.
 *
 * Antam does not provide an official API, and the public price pages
 * (logammulia.com, harga-emas.org) are protected by anti-bot measures and are
 * often blocked in sandboxed networks. We attempt a best-effort scrape and fall
 * back to deterministic mock data so the feature is always demonstrable.
 *
 * The mock derives a buyback (~8% below sell) and the spread, which are the
 * numbers that actually matter for a gold investment decision.
 */

const ANTAM_SYMBOL = "ANTAM-GOLD";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function scrapeAntam(): Promise<{ sell: number; buyback: number } | null> {
  try {
    const res = await fetch("https://harga-emas.org/", {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Best-effort extraction; structure may change. Look for the per-gram base
    // price ("Harga per gram") and a buyback ("Buyback") figure.
    const sell = extractRupiah(html, /per\s*gram[^0-9]{0,40}([0-9.]{6,})/i);
    const buyback = extractRupiah(html, /buyback[^0-9]{0,40}([0-9.]{6,})/i);
    if (sell) return { sell, buyback: buyback ?? Math.round(sell * 0.92) };
    return null;
  } catch {
    return null;
  }
}

function extractRupiah(html: string, re: RegExp): number | null {
  const m = html.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 100_000 ? n : null;
}

export async function getAntamQuote(): Promise<Quote> {
  const scraped = await scrapeAntam();
  // If live scrape fails, try the snapshot store (still real data) before mock.
  const sourced = scraped ?? (await storedAsScrape());
  if (!sourced) return mockQuote(ANTAM_SYMBOL);

  const { sell, buyback } = sourced;
  const base = mockQuote(ANTAM_SYMBOL); // for spark + 52w estimate

  // Prefer real previous close & 52w range derived from the store when present.
  const stored = await getStoredAntamCandles("1Y");
  let previousClose = base.previousClose;
  let high52 = base.high52;
  let low52 = base.low52;
  let spark = base.spark;
  if (stored && stored.length >= 2) {
    previousClose = stored[stored.length - 2].close;
    const closes = stored.map((c) => c.close);
    high52 = Math.max(...closes);
    low52 = Math.min(...closes);
    spark = closes.slice(-30);
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
  };
}

/** Use the latest stored snapshot as if it were a fresh scrape. */
async function storedAsScrape(): Promise<{ sell: number; buyback: number } | null> {
  const last = await latestStored();
  return last ? { sell: last.sell, buyback: last.buyback } : null;
}

export async function getAntamHistory(
  range: RangeKey,
): Promise<{ candles: Candle[]; mock: boolean }> {
  // Prefer the accumulated daily snapshot store (real data). Fall back to the
  // deterministic mock series when the store has too few points for this range.
  const stored = await getStoredAntamCandles(range);
  if (stored && stored.length >= 2) return { candles: stored, mock: false };
  return { candles: mockHistory(ANTAM_SYMBOL, range), mock: true };
}
