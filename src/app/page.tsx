"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/types";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAlerts, useTriggerToasts } from "@/hooks/useAlerts";
import WatchlistTable from "@/components/WatchlistTable";
import AssetPicker from "@/components/AssetPicker";
import CurrencyToggle from "@/components/CurrencyToggle";

const REFRESH_MS = 60_000;

export default function DashboardPage() {
  const { symbols, loaded, add, remove, setAll } = useWatchlist();
  const { alerts, evaluate } = useAlerts();
  const toasts = useTriggerToasts(alerts);

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [signals, setSignals] = useState<
    Record<string, { verdict: string; score: number }>
  >({});
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;

  const fetchQuotes = useCallback(async (syms: string[]) => {
    if (syms.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(syms.join(","))}`,
      );
      const data = await res.json();
      const map: Record<string, Quote> = {};
      let mock = false;
      for (const q of data.quotes as Quote[]) {
        map[q.symbol] = q;
        if (q.mock) mock = true;
      }
      setQuotes(map);
      setUsingMock(mock);
      setUpdatedAt(Date.now());
      evaluateRef.current(data.quotes as Quote[]);
    } catch {
      /* keep previous quotes */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    fetchQuotes(symbols);
    const id = setInterval(() => fetchQuotes(symbols), REFRESH_MS);
    return () => clearInterval(id);
  }, [loaded, symbols, fetchQuotes]);

  // Technical verdict per asset (changes slowly -> fetch once per symbol set).
  useEffect(() => {
    if (!loaded || symbols.length === 0) {
      setSignals({});
      return;
    }
    let cancelled = false;
    fetch(`/api/analysis?symbols=${encodeURIComponent(symbols.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const map: Record<string, { verdict: string; score: number }> = {};
        for (const row of d.rows ?? []) {
          if (row?.signals) {
            map[row.symbol] = {
              verdict: row.signals.verdict,
              score: row.signals.score,
            };
          }
        }
        setSignals(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loaded, symbols]);

  return (
    <div className="space-y-5">
      {usingMock && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          ⚠️ Menampilkan <strong>data contoh (mock)</strong>. Sumber data live
          belum dapat diakses dari lingkungan ini — tambahkan host seperti{" "}
          <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-1">
            query1.finance.yahoo.com
          </code>{" "}
          ke network egress allowlist untuk data asli.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {symbols.length} aset dipantau
            {updatedAt && (
              <>
                {" · "}diperbarui{" "}
                {new Date(updatedAt).toLocaleTimeString("id-ID")}
              </>
            )}
            {loading && <span className="ml-2 text-slate-400 dark:text-slate-500">memuat…</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencyToggle />
          <AssetPicker inWatchlist={symbols} onAdd={add} />
        </div>
      </div>

      <WatchlistTable
        symbols={symbols}
        quotes={quotes}
        signals={signals}
        loading={loading}
        onRemove={remove}
        onReorder={setAll}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Tip: klik sebuah aset untuk melihat grafik detail, indikator teknikal
        (MA &amp; RSI), dan mengatur alert harga.
      </p>

      {/* Alert toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card flex items-center gap-2 border-brand/50 px-4 py-3 text-sm shadow-xl"
          >
            🔔 <span className="font-medium">{t.symbol}</span> menyentuh target{" "}
            {t.direction === "above" ? "≥" : "≤"} {t.target}
          </div>
        ))}
      </div>
    </div>
  );
}
