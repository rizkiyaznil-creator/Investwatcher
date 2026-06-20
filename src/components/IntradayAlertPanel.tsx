"use client";

import {
  useIntradayAlerts,
  INTRADAY_ALERT_LABEL,
  type IntradayAlertType,
} from "@/hooks/useIntradayAlerts";

const TYPES: IntradayAlertType[] = ["vwap_up", "vwap_down", "or_high", "or_low"];

/** Arm & manage intraday (VWAP / opening-range) alerts for a single asset. */
export default function IntradayAlertPanel({ symbol }: { symbol: string }) {
  const { forSymbol, add, remove } = useIntradayAlerts();
  const alerts = forSymbol(symbol);
  const activeTypes = new Set(alerts.filter((a) => !a.triggeredAt).map((a) => a.type));

  return (
    <div className="card p-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">⚡ Alert Intraday</h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Beri tahu saya saat harga menembus VWAP atau Opening Range hari ini.
      </p>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => {
          const on = activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => !on && add(symbol, t)}
              disabled={on}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                on
                  ? "cursor-default border-brand bg-brand/15 text-brand"
                  : "border-slate-300 text-slate-600 hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {on ? "✓ " : "+ "}
              {INTRADAY_ALERT_LABEL[t]}
            </button>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              <span>
                {INTRADAY_ALERT_LABEL[a.type]}
                {a.triggeredAt ? (
                  <span className="ml-2 rounded bg-brand/20 px-1.5 py-0.5 text-xs text-brand">tercapai</span>
                ) : (
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">aktif</span>
                )}
              </span>
              <button
                onClick={() => remove(a.id)}
                className="text-slate-500 hover:text-down dark:text-slate-400"
                title="Hapus alert"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Dievaluasi ~tiap menit selama tab terbuka; data intraday bisa telat ~15-20 menit, jadi
        deteksi tembus bersifat perkiraan. Notifikasi browser muncul bila diizinkan.
      </p>
    </div>
  );
}
