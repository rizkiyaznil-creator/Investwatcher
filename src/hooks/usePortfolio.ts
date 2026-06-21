"use client";

import { useCallback, useEffect, useState } from "react";

export interface Holding {
  symbol: string;
  /** Number of shares (IDX: lots × 100). */
  shares: number;
  /** Average buy price per share, in the asset's native currency. */
  avgPrice: number;
}

const KEY = "investwatcher.portfolio.v1";

function load(): Holding[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(h: Holding[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
  } catch {}
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHoldings(load());
    setLoaded(true);
  }, []);

  const update = useCallback((next: Holding[]) => {
    setHoldings(next);
    save(next);
  }, []);

  /** Add (or merge into existing) a holding, averaging the buy price. */
  const add = useCallback(
    (symbol: string, shares: number, avgPrice: number) => {
      if (!(shares > 0) || !(avgPrice > 0)) return;
      const cur = load();
      const i = cur.findIndex((h) => h.symbol === symbol);
      if (i >= 0) {
        const old = cur[i];
        const totalShares = old.shares + shares;
        const merged: Holding = {
          symbol,
          shares: totalShares,
          avgPrice: (old.shares * old.avgPrice + shares * avgPrice) / totalShares,
        };
        const next = [...cur];
        next[i] = merged;
        update(next);
      } else {
        update([...cur, { symbol, shares, avgPrice }]);
      }
    },
    [update],
  );

  const remove = useCallback(
    (symbol: string) => update(load().filter((h) => h.symbol !== symbol)),
    [update],
  );

  const set = useCallback(
    (symbol: string, shares: number, avgPrice: number) => {
      const next = load().map((h) =>
        h.symbol === symbol ? { ...h, shares, avgPrice } : h,
      );
      update(next);
    },
    [update],
  );

  /** Replace the entire portfolio (used by import). Sanitizes input. */
  const replaceAll = useCallback(
    (list: Holding[]) => {
      const clean = (Array.isArray(list) ? list : [])
        .filter(
          (h) =>
            h &&
            typeof h.symbol === "string" &&
            Number(h.shares) > 0 &&
            Number(h.avgPrice) > 0,
        )
        .map((h) => ({ symbol: h.symbol, shares: Number(h.shares), avgPrice: Number(h.avgPrice) }));
      update(clean);
    },
    [update],
  );

  return { holdings, loaded, add, remove, set, replaceAll };
}
