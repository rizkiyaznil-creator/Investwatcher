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

/** Full-length EMA over a numeric series (seeded with the first value). */
function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export interface MacdNow {
  macd: number;
  signal: number;
  hist: number;
}

/** Latest MACD (12,26,9) values, or null if not enough data. */
export function latestMacd(
  candles: Candle[],
  fast = 12,
  slow = 26,
  sig = 9,
): MacdNow | null {
  if (candles.length < slow + sig) return null;
  const closes = candles.map((c) => c.close);
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = emaSeries(macdLine, sig);
  const i = closes.length - 1;
  return {
    macd: macdLine[i],
    signal: signalLine[i],
    hist: macdLine[i] - signalLine[i],
  };
}

export interface BollingerNow {
  mid: number;
  upper: number;
  lower: number;
}

/** Latest Bollinger Bands (period, k stdev), or null if not enough data. */
export function latestBollinger(
  candles: Candle[],
  period = 20,
  k = 2,
): BollingerNow | null {
  if (candles.length < period) return null;
  const closes = candles.slice(-period).map((c) => c.close);
  const mean = closes.reduce((s, v) => s + v, 0) / period;
  const variance =
    closes.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { mid: mean, upper: mean + k * sd, lower: mean - k * sd };
}

/** Latest value of a simple moving average. */
export function latestSma(candles: Candle[], period: number): number | null {
  const s = sma(candles, period);
  return s.length ? s[s.length - 1].value : null;
}
