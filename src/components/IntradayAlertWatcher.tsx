"use client";

import { useEffect, useRef, useState } from "react";
import type { DailyLevels } from "@/lib/intraday";
import {
  loadIntradayAlerts,
  markIntradayTriggered,
  INTRADAY_ALERT_LABEL,
  type IntradayAlert,
} from "@/hooks/useIntradayAlerts";

const POLL_MS = 60_000;
const CHANGED_EVENT = "investwatcher:intraday-alerts-changed";

interface Snap {
  last?: number;
  vwap?: number;
  orHigh?: number;
  orLow?: number;
  ema9?: number;
  ema20?: number;
}
interface Toast {
  id: string;
  symbol: string;
  label: string;
}

function notify(symbol: string, label: string, last?: number) {
  const body = `${symbol}: ${label}${last != null ? ` (${last})` : ""}`;
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⚡ Alert Intraday InvestWatcher", { body });
      return;
    }
  } catch {}
  // eslint-disable-next-line no-console
  console.info("[intraday-alert]", body);
}

/** Detect whether an alert crossed between two snapshots. */
function crossed(type: IntradayAlert["type"], prev: Snap, cur: Snap): boolean {
  if (cur.last == null) return false;
  switch (type) {
    case "vwap_up":
      return prev.vwap != null && prev.last != null && cur.vwap != null && prev.last < prev.vwap && cur.last >= cur.vwap;
    case "vwap_down":
      return prev.vwap != null && prev.last != null && cur.vwap != null && prev.last > prev.vwap && cur.last <= cur.vwap;
    case "or_high":
      return prev.orHigh != null && prev.last != null && cur.orHigh != null && prev.last <= prev.orHigh && cur.last > cur.orHigh;
    case "or_low":
      return prev.orLow != null && prev.last != null && cur.orLow != null && prev.last >= prev.orLow && cur.last < cur.orLow;
    case "ema_up":
      return prev.ema9 != null && prev.ema20 != null && cur.ema9 != null && cur.ema20 != null && prev.ema9 <= prev.ema20 && cur.ema9 > cur.ema20;
    case "ema_down":
      return prev.ema9 != null && prev.ema20 != null && cur.ema9 != null && cur.ema20 != null && prev.ema9 >= prev.ema20 && cur.ema9 < cur.ema20;
  }
}

/**
 * App-wide watcher: while any tab is open, polls intraday levels for symbols
 * with active intraday alerts and fires a notification when a level is crossed.
 * Mounted once in Providers.
 */
export default function IntradayAlertWatcher() {
  const prevRef = useRef<Map<string, Snap>>(new Map());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const active = loadIntradayAlerts().filter((a) => !a.triggeredAt);
      const symbols = Array.from(new Set(active.map((a) => a.symbol)));
      if (symbols.length > 0) {
        const levels = await Promise.all(
          symbols.map((s) =>
            fetch(`/api/intraday?symbol=${encodeURIComponent(s)}`)
              .then((r) => r.json())
              .then((d: DailyLevels) => ({ s, d }))
              .catch(() => ({ s, d: null as DailyLevels | null })),
          ),
        );
        if (cancelled) return;

        const triggered: string[] = [];
        const fresh: Toast[] = [];
        for (const { s, d } of levels) {
          if (!d) continue;
          const cur: Snap = {
            last: d.intraday?.last ?? d.prevClose,
            vwap: d.intraday?.vwap,
            orHigh: d.intraday?.orHigh,
            orLow: d.intraday?.orLow,
            ema9: d.signals?.ema9,
            ema20: d.signals?.ema20,
          };
          const prev = prevRef.current.get(s);
          if (prev) {
            for (const a of active.filter((x) => x.symbol === s)) {
              if (crossed(a.type, prev, cur)) {
                triggered.push(a.id);
                const label = INTRADAY_ALERT_LABEL[a.type];
                notify(a.symbol, label, cur.last);
                fresh.push({ id: a.id, symbol: a.symbol, label });
              }
            }
          }
          prevRef.current.set(s, cur);
        }

        if (triggered.length) {
          markIntradayTriggered(triggered);
          setToasts((p) => [...p, ...fresh]);
          const ids = fresh.map((t) => t.id);
          setTimeout(() => setToasts((p) => p.filter((t) => !ids.includes(t.id))), 10_000);
        }
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }

    tick();
    const onChange = () => {
      // New alert added: run a baseline poll soon so prev snapshots exist.
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, 1500);
    };
    window.addEventListener(CHANGED_EVENT, onChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(CHANGED_EVENT, onChange);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card flex items-center gap-2 border-brand/50 px-4 py-3 text-sm shadow-xl"
        >
          ⚡ <span className="font-medium">{t.symbol}</span> {t.label}
        </div>
      ))}
    </div>
  );
}
