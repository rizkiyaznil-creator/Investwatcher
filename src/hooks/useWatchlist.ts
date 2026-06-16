"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WATCHLIST } from "@/lib/assets";

const KEY = "investwatcher.watchlist.v1";

/** Persisted watchlist of symbols, stored in localStorage. */
export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSymbols(parsed);
        else setSymbols(DEFAULT_WATCHLIST);
      } else {
        setSymbols(DEFAULT_WATCHLIST);
      }
    } catch {
      setSymbols(DEFAULT_WATCHLIST);
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const add = useCallback(
    (symbol: string) => {
      setSymbols((prev) => {
        if (prev.includes(symbol)) return prev;
        const next = [...prev, symbol];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [],
  );

  const remove = useCallback((symbol: string) => {
    setSymbols((prev) => {
      const next = prev.filter((s) => s !== symbol);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const has = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);

  const reset = useCallback(() => persist(DEFAULT_WATCHLIST), [persist]);

  return { symbols, loaded, add, remove, has, reset, setAll: persist };
}
