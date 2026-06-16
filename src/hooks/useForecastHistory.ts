"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "investwatcher.forecastHistory.v1";

export interface ForecastRecord {
  id: string;
  createdAt: number; // ms epoch when the projection was saved
  symbol: string;
  assetName: string;
  method: "technical" | "ai";
  providerLabel?: string;
  horizonMonths: number;
  years: number;
  targetAt: number; // createdAt + horizon
  basePrice: number; // asset price (native currency) at save time
  priceCurrency: string;
  amount?: number; // optional invested amount for value display
  amountCurrency?: "IDR" | "USD";
  expectedReturnPct: number;
  lowReturnPct: number;
  highReturnPct: number;
}

export type NewForecastRecord = Omit<ForecastRecord, "id" | "createdAt" | "targetAt">;

const MONTH_MS = 30.4375 * 24 * 3600 * 1000;

/** Persisted history of saved projections, for later real-world confirmation. */
export function useForecastHistory() {
  const [records, setRecords] = useState<ForecastRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecords(parsed);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const write = useCallback((next: ForecastRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const add = useCallback(
    (rec: NewForecastRecord) => {
      const createdAt = Date.now();
      const full: ForecastRecord = {
        ...rec,
        id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt,
        targetAt: createdAt + rec.horizonMonths * MONTH_MS,
      };
      setRecords((prev) => {
        const next = [full, ...prev].slice(0, 100);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return full;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => write([]), [write]);

  return { records, loaded, add, remove, clear };
}
