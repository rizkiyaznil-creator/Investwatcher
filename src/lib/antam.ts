import type { Quote, Candle, RangeKey } from "./types";
import { mockHistory, mockQuote } from "./mock";

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
  if (!scraped) return mockQuote(ANTAM_SYMBOL);

  const { sell, buyback } = scraped;
  const baseQuote = mockQuote(ANTAM_SYMBOL); // reuse for prevClose/spark estimate
  const change = sell - baseQuote.previousClose;
  return {
    symbol: ANTAM_SYMBOL,
    price: sell,
    previousClose: baseQuote.previousClose,
    change: Math.round(change),
    changePercent: Math.round((change / baseQuote.previousClose) * 10000) / 100,
    currency: "IDR",
    high52: baseQuote.high52,
    low52: baseQuote.low52,
    spark: baseQuote.spark,
    buyback,
    spread: sell - buyback,
    marketTime: Math.floor(Date.now() / 1000),
    mock: false,
  };
}

export async function getAntamHistory(
  range: RangeKey,
): Promise<{ candles: Candle[]; mock: boolean }> {
  // Antam does not expose historical series publicly; we use the deterministic
  // mock series so the chart works. (A future version could store daily scrapes.)
  return { candles: mockHistory(ANTAM_SYMBOL, range), mock: true };
}
