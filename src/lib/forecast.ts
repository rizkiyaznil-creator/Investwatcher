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
