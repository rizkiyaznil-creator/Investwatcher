import { promises as fs } from "node:fs";
import path from "node:path";
import type { Candle, RangeKey } from "./types";

/**
 * File-based historical store for Emas Antam prices.
 *
 * Antam does not expose a historical price API, so we accumulate daily snapshots
 * into a JSON file that is committed to the repo (see scripts/snapshot-antam.mjs
 * and the GitHub Actions workflow). This acts as a lightweight, persistent
 * "database" that survives ephemeral/serverless deployments via git, and can be
 * swapped for a real DB later without changing callers.
 */

export interface AntamPoint {
  date: string; // YYYY-MM-DD
  sell: number; // harga jual per gram (IDR)
  buyback: number; // harga buyback per gram (IDR)
}

export interface AntamStore {
  unit: string;
  currency: string;
  points: AntamPoint[];
}

const STORE_PATH = path.join(process.cwd(), "data", "antam-history.json");

export async function readStore(): Promise<AntamStore | null> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AntamStore;
    if (Array.isArray(parsed?.points)) return parsed;
    return null;
  } catch {
    return null;
  }
}

const RANGE_DAYS: Record<RangeKey, number> = {
  "1D": 3,
  "1W": 8,
  "1M": 32,
  "3M": 95,
  "1Y": 370,
  "5Y": 1840,
};

/** Build daily OHLC candles from stored points within the given range. */
export async function getStoredAntamCandles(
  range: RangeKey,
): Promise<Candle[] | null> {
  const store = await readStore();
  if (!store || store.points.length < 2) return null;

  const points = [...store.points].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  const cutoff = Date.now() - RANGE_DAYS[range] * 86400 * 1000;
  const inRange = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  const used = inRange.length >= 2 ? inRange : points.slice(-2);
  if (used.length < 2) return null;

  const candles: Candle[] = [];
  for (let i = 0; i < used.length; i++) {
    const p = used[i];
    const prev = used[i - 1] ?? p;
    const time = Math.floor(new Date(p.date + "T00:00:00Z").getTime() / 1000);
    const open = prev.sell;
    const close = p.sell;
    candles.push({
      time,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
    });
  }
  return candles;
}

/** Latest stored point, if any. */
export async function latestStored(): Promise<AntamPoint | null> {
  const store = await readStore();
  if (!store || store.points.length === 0) return null;
  return store.points.reduce((a, b) => (a.date > b.date ? a : b));
}

/** Append (or replace) today's snapshot and persist. Used by the snapshot job. */
export async function appendSnapshot(point: AntamPoint): Promise<void> {
  const store = (await readStore()) ?? {
    unit: "per gram",
    currency: "IDR",
    points: [],
  };
  const idx = store.points.findIndex((p) => p.date === point.date);
  if (idx >= 0) store.points[idx] = point;
  else store.points.push(point);
  store.points.sort((a, b) => (a.date < b.date ? -1 : 1));
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n", "utf-8");
}
