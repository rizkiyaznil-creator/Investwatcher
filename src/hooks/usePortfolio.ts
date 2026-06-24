"use client";

import { useCallback, useEffect, useState } from "react";

export interface Holding {
  symbol: string;
  /** Number of shares (IDX: lots × 100). */
  shares: number;
  /** Average buy price per share, in the asset's native currency. */
  avgPrice: number;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  /** Shares transacted (IDX: lots × 100). */
  shares: number;
  /** Price per share, in the asset's native currency. */
  price: number;
  /** Transaction date, YYYY-MM-DD. */
  date: string;
  createdAt: number;
}

const KEY = "investwatcher.portfolio.v1";
const TX_KEY = "investwatcher.portfolioTx.v1";

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
function loadTx(): Transaction[] {
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveTx(t: Transaction[]) {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(t));
  } catch {}
}
function newId() {
  return Math.random().toString(36).slice(2);
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHoldings(load());
    setTransactions(loadTx());
    setLoaded(true);
  }, []);

  const update = useCallback((next: Holding[]) => {
    setHoldings(next);
    save(next);
  }, []);

  const logTx = useCallback((tx: Omit<Transaction, "id" | "createdAt">) => {
    const entry: Transaction = { ...tx, id: newId(), createdAt: Date.now() };
    const next = [...loadTx(), entry];
    setTransactions(next);
    saveTx(next);
  }, []);

  /** Add (or merge into existing) a holding, averaging the buy price. Logs a buy. */
  const add = useCallback(
    (symbol: string, shares: number, avgPrice: number, date?: string) => {
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
      logTx({ symbol, type: "buy", shares, price: avgPrice, date: date ?? new Date().toISOString().slice(0, 10) });
    },
    [update, logTx],
  );

  /** Reduce a holding (sell). Removes it when shares reach zero. Logs a sell. */
  const reduce = useCallback(
    (symbol: string, shares: number, price: number, date?: string) => {
      if (!(shares > 0)) return;
      const cur = load();
      const i = cur.findIndex((h) => h.symbol === symbol);
      if (i < 0) return;
      const old = cur[i];
      const remaining = old.shares - shares;
      let next: Holding[];
      if (remaining > 0.0000001) {
        next = [...cur];
        next[i] = { ...old, shares: remaining }; // avg cost unchanged on sell
      } else {
        next = cur.filter((h) => h.symbol !== symbol);
      }
      update(next);
      logTx({ symbol, type: "sell", shares: Math.min(shares, old.shares), price: price > 0 ? price : old.avgPrice, date: date ?? new Date().toISOString().slice(0, 10) });
    },
    [update, logTx],
  );

  const remove = useCallback(
    (symbol: string) => update(load().filter((h) => h.symbol !== symbol)),
    [update],
  );

  const removeTx = useCallback((id: string) => {
    const next = loadTx().filter((t) => t.id !== id);
    setTransactions(next);
    saveTx(next);
  }, []);

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

  return { holdings, transactions, loaded, add, reduce, remove, removeTx, set, replaceAll };
}
