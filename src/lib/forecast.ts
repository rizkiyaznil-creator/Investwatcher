import type { Candle } from "./types";
import { computeMetrics } from "./analytics";

export interface TechForecast {
  years: number;
  /** Projected return over the horizon (%), base case. */
  baseReturnPct: number | null;
  /** ~68% scenario band (1 stdev), lognormal. */
  lowReturnPct: number | null;
  highReturnPct: number | null;
  /** Inputs used. */
  annualReturnPct: number | null; // CAGR
  annualVolPct: number | null;
  spanYears: number | null;
}

/**
 * Statistical projection from historical data: compound the historical annual
 * growth (CAGR) over the horizon, with a ±1σ lognormal band from annualized
 * volatility. Educational extrapolation — not a guarantee.
 */
export function technicalForecast(
  candles: Candle[],
  horizonMonths: number,
): TechForecast {
  const m = computeMetrics(candles);
  const years = horizonMonths / 12;
  const cagr = m.cagr; // percent
  const vol = m.volatility; // percent, annualized

  if (cagr == null) {
    return {
      years,
      baseReturnPct: null,
      lowReturnPct: null,
      highReturnPct: null,
      annualReturnPct: cagr,
      annualVolPct: vol,
      spanYears: m.spanYears,
    };
  }

  const mu = Math.log(1 + cagr / 100); // annual log drift
  const sigma = vol != null ? vol / 100 : 0;
  const drift = mu * years;
  const spread = sigma * Math.sqrt(years);

  const base = Math.exp(drift) - 1;
  const low = sigma > 0 ? Math.exp(drift - spread) - 1 : base;
  const high = sigma > 0 ? Math.exp(drift + spread) - 1 : base;

  return {
    years,
    baseReturnPct: base * 100,
    lowReturnPct: low * 100,
    highReturnPct: high * 100,
    annualReturnPct: cagr,
    annualVolPct: vol,
    spanYears: m.spanYears,
  };
}

export interface PathBand {
  /** Years elapsed since the projection was made (capped at horizon). */
  elapsedYears: number;
  /** Fraction of the horizon elapsed, 0..1. */
  elapsedFraction: number;
  /** Expected return up to "now" along the projected path (%). */
  expectedSoFarPct: number;
  lowSoFarPct: number;
  highSoFarPct: number;
}

/**
 * Reconstruct the projected return band at an intermediate point in time, so a
 * realized return can be compared fairly against "where the projection said we
 * should be by now". Derives annual log-drift (µ) and volatility (σ) from the
 * stored horizon-end expected/low/high, then scales to elapsed time.
 */
export function projectedBandAt(
  p: {
    createdAt: number;
    years: number;
    expectedReturnPct: number;
    lowReturnPct: number;
    highReturnPct: number;
  },
  atMs: number,
): PathBand {
  const YEAR_MS = 365.25 * 24 * 3600 * 1000;
  const years = Math.max(p.years, 1e-6);
  const elapsedYears = Math.min(
    years,
    Math.max(0, (atMs - p.createdAt) / YEAR_MS),
  );
  const elapsedFraction = elapsedYears / years;

  const mu = Math.log(1 + p.expectedReturnPct / 100) / years; // annual drift
  // Half-width of the band (in log space) at the horizon, averaged.
  const sHigh = Math.log(1 + p.highReturnPct / 100) - mu * years;
  const sLow = mu * years - Math.log(1 + p.lowReturnPct / 100);
  const spreadHorizon = Math.max(0, (sHigh + sLow) / 2);
  const sigma = spreadHorizon / Math.sqrt(years);

  const drift = mu * elapsedYears;
  const spread = sigma * Math.sqrt(elapsedYears);
  return {
    elapsedYears,
    elapsedFraction,
    expectedSoFarPct: (Math.exp(drift) - 1) * 100,
    lowSoFarPct: (Math.exp(drift - spread) - 1) * 100,
    highSoFarPct: (Math.exp(drift + spread) - 1) * 100,
  };
}
