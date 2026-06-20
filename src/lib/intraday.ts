import { getHistory, getDailyHistory } from "./yahoo";
import { getAsset } from "./assets";
import { isIdx, autoReject, pivotPoints, type AutoReject, type PivotLevels } from "./idx";
import type { Candle } from "./types";

export interface DailyLevels {
  available: boolean;
  symbol: string;
  currency?: string;
  mock?: boolean;
  isIdx: boolean;
  /** Reference (previous trading day close). */
  prevClose?: number;
  prevHigh?: number;
  prevLow?: number;
  pivots?: PivotLevels;
  autoReject?: AutoReject;
  /** Today's intraday stats (when a session exists today). */
  intraday?: {
    open?: number;
    high?: number;
    low?: number;
    last?: number;
    vwap?: number;
    /** Opening range (first 30 minutes) high/low. */
    orHigh?: number;
    orLow?: number;
  };
}

/** YYYY-MM-DD in Asia/Jakarta for a unix-seconds timestamp. */
function dateJakarta(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function vwapOf(candles: Candle[]): number | undefined {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    if (c.volume == null || c.volume <= 0) continue;
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
  }
  return vol > 0 ? pv / vol : undefined;
}

/** Intraday day-trading levels: pivots, ARA/ARB, VWAP, opening range. */
export async function getDailyLevels(symbol: string): Promise<DailyLevels> {
  const idx = isIdx(symbol);
  const currency = getAsset(symbol)?.currency;
  try {
    const [daily, intra] = await Promise.all([
      getDailyHistory(symbol, "1mo"),
      getHistory(symbol, "1D"),
    ]);

    const dc = daily.candles;
    if (dc.length < 2) {
      return { available: false, symbol, isIdx: idx, currency };
    }

    const today = dateJakarta(Math.floor(Date.now() / 1000));
    const lastIsToday = dateJakarta(dc[dc.length - 1].time) === today;
    const prev = dc[lastIsToday ? dc.length - 2 : dc.length - 1];

    const pivots = pivotPoints(prev.high, prev.low, prev.close);
    const ar = autoReject(prev.close);

    // Today's intraday candles only (range=1d already, but guard against bleed).
    const todays = intra.candles.filter((c) => dateJakarta(c.time) === today);
    let intraday: DailyLevels["intraday"];
    if (todays.length > 0) {
      const or = todays.slice(0, 6); // first ~30 min of 5m candles
      intraday = {
        open: todays[0].open,
        high: Math.max(...todays.map((c) => c.high)),
        low: Math.min(...todays.map((c) => c.low)),
        last: todays[todays.length - 1].close,
        vwap: vwapOf(todays),
        orHigh: or.length ? Math.max(...or.map((c) => c.high)) : undefined,
        orLow: or.length ? Math.min(...or.map((c) => c.low)) : undefined,
      };
    }

    return {
      available: true,
      symbol,
      currency,
      mock: daily.mock || intra.mock,
      isIdx: idx,
      prevClose: prev.close,
      prevHigh: prev.high,
      prevLow: prev.low,
      pivots,
      autoReject: idx ? ar : undefined,
      intraday,
    };
  } catch {
    return { available: false, symbol, isIdx: idx, currency };
  }
}
