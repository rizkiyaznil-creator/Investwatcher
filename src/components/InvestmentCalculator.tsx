"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogContext";
import AmountInput from "./AmountInput";
import { useForecastHistory } from "@/hooks/useForecastHistory";
import { formatPrice } from "@/lib/format";
import type { TechForecast } from "@/lib/forecast";

interface AiResult {
  enabled: boolean;
  providerLabel?: string;
  model?: string;
  expectedReturnPct?: number;
  lowReturnPct?: number;
  highReturnPct?: number;
  confidence?: string;
  rationale?: string;
  note?: string;
}
interface ForecastResp {
  symbol: string;
  horizon: number;
  currency: string;
  price: number;
  mock: boolean;
  technical: TechForecast;
  ai?: AiResult;
}

const PRESETS = [1, 3, 6, 12, 24, 60];
const PROVIDERS = [
  { key: "claude", label: "Claude" },
  { key: "deepseek-chat", label: "DeepSeek V3" },
  { key: "deepseek-reasoner", label: "DeepSeek R1" },
];

function color(v: number | null | undefined): string {
  if (v == null) return "text-slate-500 dark:text-slate-400";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}
function pctStr(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export default function InvestmentCalculator() {
  const { all, resolve } = useCatalog();
  const { add } = useForecastHistory();
  const assets = useMemo(() => all.filter((a) => a.type !== "fx"), [all]);

  const [savedTech, setSavedTech] = useState(false);
  const [savedAi, setSavedAi] = useState(false);

  const [symbol, setSymbol] = useState("GC=F");
  const [amount, setAmount] = useState(10_000_000);
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");
  const [horizon, setHorizon] = useState(12);

  const [tech, setTech] = useState<ForecastResp | null>(null);
  const [techLoading, setTechLoading] = useState(false);

  const [provider, setProvider] = useState("claude");
  const [ai, setAi] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Technical projection — auto, debounced on symbol/horizon.
  useEffect(() => {
    let cancelled = false;
    setTechLoading(true);
    setAi(null); // invalidate AI when inputs change
    setSavedTech(false);
    setSavedAi(false);
    const t = setTimeout(() => {
      fetch(`/api/forecast?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}`)
        .then((r) => r.json())
        .then((d) => !cancelled && setTech(d))
        .catch(() => {})
        .finally(() => !cancelled && setTechLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [symbol, horizon]);

  const runAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/forecast?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}&provider=${encodeURIComponent(provider)}`,
      );
      const d: ForecastResp = await res.json();
      setAi(d.ai ?? { enabled: false, note: "Tidak ada hasil." });
    } catch {
      setAi({ enabled: false, note: "Gagal menghubungi server." });
    } finally {
      setAiLoading(false);
    }
  };

  const value = (retPct: number | null | undefined) =>
    retPct == null ? null : amount * (1 + retPct / 100);

  const t = tech?.technical;

  const saveTech = () => {
    if (!t || t.baseReturnPct == null || !tech) return;
    add({
      symbol,
      assetName: resolve(symbol).short,
      method: "technical",
      horizonMonths: horizon,
      years: horizon / 12,
      basePrice: tech.price,
      priceCurrency: tech.currency,
      amount,
      amountCurrency: currency,
      expectedReturnPct: t.baseReturnPct,
      lowReturnPct: t.lowReturnPct ?? t.baseReturnPct,
      highReturnPct: t.highReturnPct ?? t.baseReturnPct,
    });
    setSavedTech(true);
  };

  const saveAi = () => {
    if (!ai || !ai.enabled || ai.expectedReturnPct == null || !tech) return;
    add({
      symbol,
      assetName: resolve(symbol).short,
      method: "ai",
      providerLabel: ai.providerLabel,
      horizonMonths: horizon,
      years: horizon / 12,
      basePrice: tech.price,
      priceCurrency: tech.currency,
      amount,
      amountCurrency: currency,
      expectedReturnPct: ai.expectedReturnPct,
      lowReturnPct: ai.lowReturnPct ?? ai.expectedReturnPct,
      highReturnPct: ai.highReturnPct ?? ai.expectedReturnPct,
    });
    setSavedAi(true);
  };

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold">🧮 Kalkulator Investasi</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Proyeksikan nilai investasi Anda berdasarkan tren statistik (teknikal)
        dan perkiraan AI. Keduanya <strong>proyeksi, bukan jaminan</strong>.
      </p>

      {/* Form */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500 dark:text-slate-400">Aset</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
          >
            {assets.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.short} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500 dark:text-slate-400">Jumlah investasi</span>
          <div className="flex gap-2">
            <AmountInput
              value={amount}
              onChange={setAmount}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "IDR" | "USD")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="IDR">Rp</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </label>
      </div>

      {/* Horizon: presets + free input */}
      <div className="mt-3">
        <span className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Jangka waktu</span>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              className={`rounded-lg border px-3 py-1 text-sm transition-colors ${
                horizon === m
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-slate-300 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {m} bln
            </button>
          ))}
          <span className="text-slate-400 dark:text-slate-500">atau</span>
          <input
            type="number"
            min={1}
            max={120}
            value={horizon}
            onChange={(e) => setHorizon(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-sm text-slate-400 dark:text-slate-500">bulan</span>
        </div>
      </div>

      {tech?.mock && (
        <p className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Sebagian data adalah contoh (mock) — sumber live terbatas di lingkungan ini.
        </p>
      )}

      {/* Results: two separate projections */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Technical */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="font-medium">📈 Proyeksi Teknikal</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Dari tren historis (CAGR &amp; volatilitas).
          </p>
          {techLoading && !t ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Menghitung…</p>
          ) : t && t.baseReturnPct != null ? (
            <>
              <div className="text-2xl font-bold tabular-nums">
                {formatPrice(value(t.baseReturnPct)!, currency)}
              </div>
              <div className={`text-sm tabular-nums ${color(t.baseReturnPct)}`}>
                {pctStr(t.baseReturnPct)} dalam {horizon} bln
              </div>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Rentang skenario (~68%):
                <div className="mt-1 flex justify-between tabular-nums">
                  <span className="text-down">{formatPrice(value(t.lowReturnPct)!, currency)}</span>
                  <span className="text-up">{formatPrice(value(t.highReturnPct)!, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{pctStr(t.lowReturnPct)}</span>
                  <span>{pctStr(t.highReturnPct)}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Basis: CAGR {pctStr(t.annualReturnPct)}/th, volatilitas {t.annualVolPct?.toFixed(0) ?? "?"}%/th
                {t.spanYears ? ` (~${t.spanYears.toFixed(1)} th data)` : ""}.
              </p>
              <button
                onClick={saveTech}
                disabled={savedTech}
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:text-brand disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                {savedTech ? "✓ Tersimpan di riwayat" : "💾 Simpan proyeksi"}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Data historis tidak cukup untuk proyeksi.
            </p>
          )}
        </div>

        {/* AI */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="font-medium">🤖 Proyeksi AI</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Teknikal + fundamental + pasar + berita.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setProvider(p.key)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                    provider === p.key
                      ? "bg-white text-brand shadow-sm dark:bg-slate-700"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={runAi} disabled={aiLoading} className="btn-primary py-1 text-xs disabled:opacity-60">
              {aiLoading ? "Memproyeksi…" : "Proyeksi AI"}
            </button>
          </div>

          {!ai ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Pilih penyedia lalu klik “Proyeksi AI”.
            </p>
          ) : ai.enabled && ai.expectedReturnPct != null ? (
            <>
              <div className="text-2xl font-bold tabular-nums">
                {formatPrice(value(ai.expectedReturnPct)!, currency)}
              </div>
              <div className={`text-sm tabular-nums ${color(ai.expectedReturnPct)}`}>
                {pctStr(ai.expectedReturnPct)} dalam {horizon} bln
              </div>
              {ai.confidence && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Keyakinan: <span className="font-medium">{ai.confidence}</span>
                </div>
              )}
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Rentang skenario:
                <div className="mt-1 flex justify-between tabular-nums">
                  <span className="text-down">{formatPrice(value(ai.lowReturnPct)!, currency)}</span>
                  <span className="text-up">{formatPrice(value(ai.highReturnPct)!, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{pctStr(ai.lowReturnPct)}</span>
                  <span>{pctStr(ai.highReturnPct)}</span>
                </div>
              </div>
              {ai.rationale && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {ai.rationale}
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {ai.providerLabel}{ai.model ? ` · ${ai.model}` : ""}
              </p>
              <button
                onClick={saveAi}
                disabled={savedAi}
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:text-brand disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                {savedAi ? "✓ Tersimpan di riwayat" : "💾 Simpan proyeksi"}
              </button>
            </>
          ) : (
            <p className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              ℹ️ {ai.note ?? "Proyeksi AI tidak tersedia."}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
        ⚠️ Proyeksi bersifat perkiraan dan <strong>tidak menjamin hasil</strong>. Kinerja
        masa lalu serta prediksi tidak menjamin kinerja masa depan. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
