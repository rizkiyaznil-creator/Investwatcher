import type { Candle, Quote, RangeKey } from "./types";
import { getAsset } from "./assets";
import { mockHistory, mockQuote, mockDailyHistory } from "./mock";

/**
 * Thin Yahoo Finance client. Yahoo has no official public API, so we use the
 * same chart/quote endpoints the website uses. Every call degrades gracefully
 * to deterministic mock data if the network blocks the host or the response is
 * malformed, so the app keeps working offline / in a sandbox.
 */

const CHART_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface YahooRange {
  range: string;
  interval: string;
}

function yahooRange(range: RangeKey): YahooRange {
  switch (range) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "1W":
      return { range: "5d", interval: "30m" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "3M":
      return { range: "3mo", interval: "1d" };
    case "1Y":
      return { range: "1y", interval: "1d" };
    case "5Y":
      return { range: "5y", interval: "1wk" };
  }
}

async function fetchChart(symbol: string, qs: string): Promise<any | null> {
  for (const host of CHART_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        // Cache at the edge for a short while to avoid hammering Yahoo.
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.chart?.result?.[0]) return json.chart.result[0];
    } catch {
      // try next host
    }
  }
  return null;
}

export async function getHistory(
  symbol: string,
  range: RangeKey,
): Promise<{ candles: Candle[]; mock: boolean }> {
  const { range: r, interval } = yahooRange(range);
  const result = await fetchChart(symbol, `range=${r}&interval=${interval}`);
  if (!result) return { candles: mockHistory(symbol, range), mock: true };

  try {
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = q.open?.[i];
      const high = q.high?.[i];
      const low = q.low?.[i];
      const close = q.close?.[i];
      if (close == null || open == null) continue;
      candles.push({
        time: timestamps[i],
        open,
        high: high ?? Math.max(open, close),
        low: low ?? Math.min(open, close),
        close,
        volume: q.volume?.[i] ?? undefined,
      });
    }
    if (candles.length === 0) return { candles: mockHistory(symbol, range), mock: true };
    return { candles, mock: false };
  } catch {
    return { candles: mockHistory(symbol, range), mock: true };
  }
}

export async function getQuote(symbol: string): Promise<Quote> {
  // Use the chart endpoint (with meta) which is more reliable than v7/quote.
  const result = await fetchChart(symbol, `range=1mo&interval=1d`);
  if (!result?.meta) return mockQuote(symbol);

  try {
    const meta = result.meta;
    const asset = getAsset(symbol);
    const price: number = meta.regularMarketPrice ?? meta.previousClose;
    const previousClose: number =
      meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (c: number | null) => c != null,
    );

    return {
      symbol,
      price,
      previousClose,
      change: round(change),
      changePercent: Math.round(changePercent * 100) / 100,
      currency: meta.currency ?? asset?.currency ?? "USD",
      high52: meta.fiftyTwoWeekHigh,
      low52: meta.fiftyTwoWeekLow,
      spark: closes.slice(-30),
      marketTime: meta.regularMarketTime,
      mock: false,
    };
  } catch {
    return mockQuote(symbol);
  }
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  return Promise.all(symbols.map((s) => getQuote(s)));
}

/** Long daily history (for analytics). Defaults to ~5 years of daily bars. */
export async function getDailyHistory(
  symbol: string,
  range = "5y",
): Promise<{ candles: Candle[]; mock: boolean }> {
  const result = await fetchChart(symbol, `range=${range}&interval=1d`);
  if (!result) return { candles: mockDailyHistory(symbol), mock: true };
  try {
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = q.close?.[i];
      const open = q.open?.[i];
      if (close == null || open == null) continue;
      candles.push({
        time: timestamps[i],
        open,
        high: q.high?.[i] ?? Math.max(open, close),
        low: q.low?.[i] ?? Math.min(open, close),
        close,
        volume: q.volume?.[i] ?? undefined,
      });
    }
    if (candles.length === 0) return { candles: mockDailyHistory(symbol), mock: true };
    return { candles, mock: false };
  } catch {
    return { candles: mockDailyHistory(symbol), mock: true };
  }
}

function round(n: number): number {
  if (Math.abs(n) >= 1000) return Math.round(n);
  if (Math.abs(n) >= 10) return Math.round(n * 100) / 100;
  return Math.round(n * 10000) / 10000;
}
