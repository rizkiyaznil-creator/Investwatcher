"use client";

import { useCallback, useEffect, useState } from "react";

export type IntradayAlertType = "vwap_up" | "vwap_down" | "or_high" | "or_low";

export interface IntradayAlert {
  id: string;
  symbol: string;
  type: IntradayAlertType;
  createdAt: number;
  triggeredAt?: number;
}

export const INTRADAY_ALERT_LABEL: Record<IntradayAlertType, string> = {
  vwap_up: "Tembus VWAP ↑",
  vwap_down: "Tembus VWAP ↓",
  or_high: "Tembus Opening Range High",
  or_low: "Tembus Opening Range Low",
};

const KEY = "investwatcher.intradayAlerts.v1";
const CHANGED_EVENT = "investwatcher:intraday-alerts-changed";

export function loadIntradayAlerts(): IntradayAlert[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIntradayAlerts(alerts: IntradayAlert[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(alerts));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

/** Mark alerts as triggered (used by the global watcher). */
export function markIntradayTriggered(ids: string[]) {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const next = loadIntradayAlerts().map((a) =>
    set.has(a.id) && !a.triggeredAt ? { ...a, triggeredAt: Date.now() } : a,
  );
  saveIntradayAlerts(next);
}

export function useIntradayAlerts() {
  const [alerts, setAlerts] = useState<IntradayAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAlerts(loadIntradayAlerts());
    setLoaded(true);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const onChange = () => setAlerts(loadIntradayAlerts());
    window.addEventListener(CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, []);

  const add = useCallback((symbol: string, type: IntradayAlertType) => {
    const exists = loadIntradayAlerts().some(
      (a) => a.symbol === symbol && a.type === type && !a.triggeredAt,
    );
    if (exists) return;
    const alert: IntradayAlert = {
      id: Math.random().toString(36).slice(2),
      symbol,
      type,
      createdAt: Date.now(),
    };
    saveIntradayAlerts([...loadIntradayAlerts(), alert]);
    setAlerts(loadIntradayAlerts());
  }, []);

  const remove = useCallback((id: string) => {
    saveIntradayAlerts(loadIntradayAlerts().filter((a) => a.id !== id));
    setAlerts(loadIntradayAlerts());
  }, []);

  const forSymbol = useCallback(
    (symbol: string) => alerts.filter((a) => a.symbol === symbol),
    [alerts],
  );

  return { alerts, loaded, add, remove, forSymbol };
}
