import type { Candle } from "./types";

export interface MonthSeason {
  month: number; // 0-11
  /** Average monthly return (%) across years. */
  avg: number | null;
  /** Number of months sampled. */
  count: number;
}

/**
 * Average historical return per calendar month, from daily candles.
 * Useful for spotting seasonal patterns (common in commodities).
 */
export function monthlySeasonality(candles: Candle[]): MonthSeason[] {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  // Last close of each calendar month -> month-over-month return.
  const monthEnd = new Map<string, { time: number; close: number }>();
  for (const c of sorted) {
    const d = new Date(c.time * 1000);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const prev = monthEnd.get(key);
    if (!prev || c.time >= prev.time) monthEnd.set(key, { time: c.time, close: c.close });
  }
  const ordered = [...monthEnd.entries()]
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return { y, m, close: v.close };
    })
    .sort((a, b) => (a.y - b.y) || (a.m - b.m));

  const buckets: number[][] = Array.from({ length: 12 }, () => []);
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1].close;
    const cur = ordered[i];
    if (prev > 0) {
      buckets[cur.m].push((cur.close / prev - 1) * 100);
    }
  }

  return buckets.map((vals, month) => ({
    month,
    avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
    count: vals.length,
  }));
}
