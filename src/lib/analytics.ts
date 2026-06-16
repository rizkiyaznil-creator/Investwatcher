import type { Candle } from "./types";

export interface PeriodReturn {
  label: string;
  /** Percentage return over the period, or null if not enough history. */
  value: number | null;
}

export interface AssetMetrics {
  returns: PeriodReturn[];
  /** Annualized volatility (%), trailing ~1Y of daily returns. */
  volatility: number | null;
  /** Maximum peak-to-trough decline (%) over the available series. */
  maxDrawdown: number | null;
  /** Compound annual growth rate (%) over the available span. */
  cagr: number | null;
  /** Return-to-risk ratio (CAGR / volatility), Sharpe-like (rf = 0). */
  riskReward: number | null;
  /** Years of history actually available. */
  spanYears: number | null;
}

const DAY = 86400;

const PERIODS: { label: string; days: number }[] = [
  { label: "1B", days: 30 },
  { label: "3B", days: 91 },
  { label: "6B", days: 182 },
  { label: "1Th", days: 365 },
  { label: "3Th", days: 365 * 3 },
  { label: "5Th", days: 365 * 5 },
];

/** Close at or just before (targetTime), searching from the end. */
function closeAtOrBefore(candles: Candle[], targetTime: number): number | null {
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= targetTime) return candles[i].close;
  }
  return null;
}

function periodReturn(candles: Candle[], days: number): number | null {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const firstTime = candles[0].time;
  const target = last.time - days * DAY;
  // Require the series to actually reach back to the target period.
  if (target < firstTime - 3 * DAY) return null;
  const past = closeAtOrBefore(candles, target);
  if (past == null || past === 0) return null;
  return (last.close / past - 1) * 100;
}

function ytdReturn(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const jan1 = Math.floor(
    new Date(new Date(last.time * 1000).getUTCFullYear(), 0, 1).getTime() / 1000,
  );
  if (candles[0].time > jan1) return null;
  const base = closeAtOrBefore(candles, jan1);
  if (base == null || base === 0) return null;
  return (last.close / base - 1) * 100;
}

/** Annualized volatility from daily log returns over the trailing window. */
function annualizedVol(candles: Candle[], lookback = 252): number | null {
  if (candles.length < 20) return null;
  const slice = candles.slice(-lookback - 1);
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const a = slice[i - 1].close;
    const b = slice[i].close;
    if (a > 0 && b > 0) rets.push(Math.log(b / a));
  }
  if (rets.length < 10) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function maxDrawdown(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  let peak = candles[0].close;
  let maxDD = 0;
  for (const c of candles) {
    if (c.close > peak) peak = c.close;
    if (peak > 0) {
      const dd = (c.close - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
  }
  return maxDD * 100; // negative number
}

function spanYears(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  return (
    (candles[candles.length - 1].time - candles[0].time) / (365.25 * DAY)
  );
}

function cagr(candles: Candle[]): number | null {
  const years = spanYears(candles);
  if (!years || years < 0.25) return null;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  if (first <= 0 || last <= 0) return null;
  return ((last / first) ** (1 / years) - 1) * 100;
}

export function computeMetrics(candles: Candle[]): AssetMetrics {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const returns: PeriodReturn[] = [];
  for (const p of PERIODS) {
    if (p.label === "1Th") {
      returns.push({ label: "YTD", value: ytdReturn(sorted) });
    }
    returns.push({ label: p.label, value: periodReturn(sorted, p.days) });
  }

  const vol = annualizedVol(sorted);
  const cg = cagr(sorted);
  const riskReward = vol && cg != null && vol !== 0 ? cg / vol : null;

  return {
    returns,
    volatility: vol,
    maxDrawdown: maxDrawdown(sorted),
    cagr: cg,
    riskReward,
    spanYears: spanYears(sorted),
  };
}
