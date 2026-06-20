import { ID_UNIVERSE } from "./screener-universe";
import { getDailyLevels } from "./intraday";
import { getAsset } from "./assets";

export interface IntradayRow {
  symbol: string;
  name: string;
  currency: string;
  last?: number;
  changePct?: number;
  relVol?: number;
  aboveVwap?: boolean;
  vwapDistPct?: number;
  /** Position within today's range, 0 (low) .. 1 (high). */
  rangePos?: number;
  /** Concrete bullish intraday/scalping signal tags. */
  signals: string[];
  /** Composite momentum score 0..100. */
  score: number;
  mock?: boolean;
}

export interface IntradayScreen {
  rows: IntradayRow[];
  mock: boolean;
  generatedAt: number;
}

/** Run `tasks` with bounded concurrency. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Build one screener row from intraday levels. */
async function rowFor(symbol: string): Promise<IntradayRow> {
  const asset = getAsset(symbol);
  const name = asset?.short ?? symbol.replace(".JK", "");
  const currency = asset?.currency ?? "IDR";
  try {
    const d = await getDailyLevels(symbol);
    const last = d.intraday?.last ?? d.prevClose;
    const changePct =
      last != null && d.prevClose ? (last / d.prevClose - 1) * 100 : undefined;
    const vwap = d.intraday?.vwap;
    const aboveVwap = last != null && vwap != null ? last >= vwap : undefined;
    const vwapDistPct = last != null && vwap ? (last / vwap - 1) * 100 : undefined;
    const hi = d.intraday?.high;
    const lo = d.intraday?.low;
    const rangePos =
      last != null && hi != null && lo != null && hi > lo ? (last - lo) / (hi - lo) : undefined;

    // Composite momentum score (favors up-moves on strong relative volume,
    // above VWAP, pushing toward day high).
    const chgN = clamp((changePct ?? 0) / 10, -1, 1); // +-10% saturates
    const rvN = clamp((d.relVol ?? 0) / 3, 0, 1); // 3x avg saturates
    const vwapN = aboveVwap === undefined ? 0 : aboveVwap ? 1 : 0;
    const rangeN = rangePos ?? 0.5;
    const score = Math.round(
      100 * clamp(0.45 * (chgN * 0.5 + 0.5) + 0.3 * rvN + 0.12 * vwapN + 0.13 * rangeN, 0, 1),
    );

    // Concrete bullish scalping signal tags.
    const signals: string[] = [];
    if (aboveVwap) signals.push("Di atas VWAP");
    if (d.intraday?.orHigh != null && last != null && last > d.intraday.orHigh)
      signals.push("Breakout OR");
    if ((d.relVol ?? 0) >= 1.5) signals.push(`RelVol ${(d.relVol ?? 0).toFixed(1)}x`);
    if ((rangePos ?? 0) >= 0.8) signals.push("Dekat High");
    if ((changePct ?? 0) >= 1.5) signals.push(`Menguat +${(changePct ?? 0).toFixed(1)}%`);

    return {
      symbol,
      name,
      currency,
      last,
      changePct,
      relVol: d.relVol,
      aboveVwap,
      vwapDistPct,
      rangePos,
      signals,
      score,
      mock: d.mock,
    };
  } catch {
    return { symbol, name, currency, signals: [], score: 0, mock: true };
  }
}

/** Intraday momentum screen over liquid IDX names. */
export async function runIntradayScreener(limit = 30): Promise<IntradayScreen> {
  const rows = await pool(ID_UNIVERSE, 6, rowFor);
  rows.sort((a, b) => b.score - a.score);
  const mock = rows.some((r) => r.mock);
  return { rows: rows.slice(0, limit), mock, generatedAt: Date.now() };
}
