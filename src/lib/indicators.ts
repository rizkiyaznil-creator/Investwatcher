import type { Candle } from "./types";

export interface LinePoint {
  time: number;
  value: number;
}

/** Simple Moving Average over close prices. */
export function sma(candles: Candle[], period: number): LinePoint[] {
  if (period <= 1 || candles.length < period) return [];
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }
  return out;
}

/** Exponential Moving Average over close prices. */
export function ema(candles: Candle[], period: number): LinePoint[] {
  if (period <= 1 || candles.length < period) return [];
  const k = 2 / (period + 1);
  const out: LinePoint[] = [];
  // Seed with SMA of first `period` closes.
  let prev =
    candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

/**
 * Relative Strength Index (Wilder's smoothing). Returns values in 0..100.
 */
export function rsi(candles: Candle[], period = 14): LinePoint[] {
  if (candles.length <= period) return [];
  const out: LinePoint[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out.push({ time: candles[period].time, value: rsiFrom(avgGain, avgLoss) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out.push({ time: candles[i].time, value: rsiFrom(avgGain, avgLoss) });
  }
  return out;
}

function rsiFrom(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

/** Latest RSI value, or null if not computable. */
export function latestRsi(candles: Candle[], period = 14): number | null {
  const series = rsi(candles, period);
  return series.length ? series[series.length - 1].value : null;
}
