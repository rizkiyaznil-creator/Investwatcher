import type { Candle } from "./types";

/** Map of date (YYYY-MM-DD) -> daily log return. */
export function dailyReturnsByDate(candles: Candle[]): Map<string, number> {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const map = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].close;
    const b = sorted[i].close;
    if (a > 0 && b > 0) {
      const date = new Date(sorted[i].time * 1000).toISOString().slice(0, 10);
      map.set(date, Math.log(b / a));
    }
  }
  return map;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5) return null;
  let sx = 0,
    sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0,
    vx = 0,
    vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null;
  const r = cov / Math.sqrt(vx * vy);
  return Math.max(-1, Math.min(1, r));
}

export interface CorrelationResult {
  symbols: string[];
  /** matrix[i][j] = correlation of i and j (null if not computable). */
  matrix: (number | null)[][];
  /** number of overlapping observations used (approx, max over pairs). */
  sampleSize: number;
}

/**
 * Pairwise Pearson correlation of daily returns over overlapping dates
 * (limited to the most recent `window` common observations per pair).
 */
export function correlationMatrix(
  series: { symbol: string; returns: Map<string, number> }[],
  window = 252,
): CorrelationResult {
  const symbols = series.map((s) => s.symbol);
  const n = symbols.length;
  const matrix: (number | null)[][] = Array.from({ length: n }, () =>
    Array<number | null>(n).fill(null),
  );
  let maxSample = 0;

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const a = series[i].returns;
      const b = series[j].returns;
      // Common dates, most recent `window`.
      const dates: string[] = [];
      for (const d of a.keys()) if (b.has(d)) dates.push(d);
      dates.sort();
      const used = dates.slice(-window);
      const xs = used.map((d) => a.get(d)!);
      const ys = used.map((d) => b.get(d)!);
      const r = pearson(xs, ys);
      matrix[i][j] = r;
      matrix[j][i] = r;
      if (used.length > maxSample) maxSample = used.length;
    }
  }

  return { symbols, matrix, sampleSize: maxSample };
}
