"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/types";

export interface PriceAlert {
  id: string;
  symbol: string;
  /** Trigger when price goes above (">=") or below ("<=") the target. */
  direction: "above" | "below";
  target: number;
  createdAt: number;
  triggeredAt?: number;
}

const KEY = "investwatcher.alerts.v1";

function load(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(alerts));
  } catch {}
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAlerts(load());
    setLoaded(true);
    if ("Notification" in window && Notification.permission === "default") {
      // Ask lazily; harmless if the user dismisses it.
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const update = useCallback((next: PriceAlert[]) => {
    setAlerts(next);
    save(next);
  }, []);

  const add = useCallback(
    (a: Omit<PriceAlert, "id" | "createdAt">) => {
      const alert: PriceAlert = {
        ...a,
        id: Math.random().toString(36).slice(2),
        createdAt: Date.now(),
      };
      update([...load(), alert]);
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => update(load().filter((a) => a.id !== id)),
    [update],
  );

  const forSymbol = useCallback(
    (symbol: string) => alerts.filter((a) => a.symbol === symbol),
    [alerts],
  );

  /**
   * Evaluate active alerts against the latest quotes. Marks matching alerts as
   * triggered and fires a browser notification (best effort).
   */
  const evaluate = useCallback(
    (quotes: Quote[]) => {
      const map = new Map(quotes.map((q) => [q.symbol, q]));
      let changed = false;
      const next = load().map((a) => {
        if (a.triggeredAt) return a;
        const q = map.get(a.symbol);
        if (!q) return a;
        const hit =
          a.direction === "above" ? q.price >= a.target : q.price <= a.target;
        if (hit) {
          changed = true;
          notify(a, q);
          return { ...a, triggeredAt: Date.now() };
        }
        return a;
      });
      if (changed) update(next);
    },
    [update],
  );

  return { alerts, loaded, add, remove, forSymbol, evaluate };
}

function notify(a: PriceAlert, q: Quote) {
  const arrow = a.direction === "above" ? "≥" : "≤";
  const msg = `${a.symbol}: ${q.price} (${arrow} ${a.target})`;
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🔔 Alert harga InvestWatcher", { body: msg });
      return;
    }
  } catch {}
  // Fallback so the trigger is never silent during a session.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info("[alert]", msg);
  }
}

/** Used by the dashboard to show a transient toast list of newly-triggered alerts. */
export function useTriggerToasts(alerts: PriceAlert[]) {
  const seen = useRef<Set<string>>(new Set());
  const [toasts, setToasts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const fresh = alerts.filter((a) => a.triggeredAt && !seen.current.has(a.id));
    if (fresh.length) {
      fresh.forEach((a) => seen.current.add(a.id));
      setToasts((prev) => [...prev, ...fresh]);
      const ids = fresh.map((a) => a.id);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => !ids.includes(t.id)));
      }, 8000);
    }
  }, [alerts]);

  return toasts;
}
