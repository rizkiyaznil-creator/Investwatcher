/**
 * Bursa Efek Indonesia (IDX) trading mechanics: tick size, auto-reject
 * (ARA/ARB), lot size, and pivot points. Rules can change — these tables
 * reflect the post-normalization regime and are meant to be verified by the
 * user against the latest IDX rule. Educational only.
 */

export const LOT_SIZE = 100;

/** True for Indonesian-listed symbols (Yahoo ".JK" suffix). */
export function isIdx(symbol: string): boolean {
  return symbol.toUpperCase().endsWith(".JK");
}

/** IDX price fraction (tick size) by price band, in rupiah. */
export function tickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

/** Round a price to the nearest valid IDX tick. */
export function roundToTick(price: number, mode: "nearest" | "down" | "up" = "nearest"): number {
  const t = tickSize(price);
  if (t <= 0) return price;
  const q = price / t;
  const n = mode === "down" ? Math.floor(q) : mode === "up" ? Math.ceil(q) : Math.round(q);
  return Math.round(n * t);
}

/** Auto-reject percentage band by price (symmetric ARA/ARB). */
export function autoRejectPct(price: number): number {
  if (price <= 200) return 0.35;
  if (price <= 5000) return 0.25;
  return 0.2;
}

export interface AutoReject {
  pct: number;
  /** Auto Reject Atas — highest price allowed today. */
  ara: number;
  /** Auto Reject Bawah — lowest price allowed today. */
  arb: number;
}

/** Compute ARA/ARB caps from a reference (previous close) price. */
export function autoReject(reference: number): AutoReject {
  const pct = autoRejectPct(reference);
  return {
    pct,
    ara: roundToTick(reference * (1 + pct), "down"),
    arb: roundToTick(reference * (1 - pct), "up"),
  };
}

export interface PivotLevels {
  p: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

/** Classic floor-trader pivot points from prior period High/Low/Close. */
export function pivotPoints(high: number, low: number, close: number): PivotLevels {
  const p = (high + low + close) / 3;
  const range = high - low;
  return {
    p,
    r1: 2 * p - low,
    s1: 2 * p - high,
    r2: p + range,
    s2: p - range,
    r3: high + 2 * (p - low),
    s3: low - 2 * (high - p),
  };
}
