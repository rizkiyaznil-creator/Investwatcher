"use client";

import { useState } from "react";

interface Result {
  enabled: boolean;
  text: string;
  note?: string;
  mock?: boolean;
  model?: string;
  provider?: string;
  providerLabel?: string;
}

const PROVIDERS: { key: string; label: string }[] = [
  { key: "claude", label: "Claude" },
  { key: "deepseek-chat", label: "DeepSeek V3" },
  { key: "deepseek-reasoner", label: "DeepSeek R1" },
];

export default function AiReview({ symbol }: { symbol: string }) {
  const [provider, setProvider] = useState("claude");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ai-review?symbol=${encodeURIComponent(symbol)}&provider=${encodeURIComponent(provider)}`,
      );
      const d = await res.json();
      setData(d);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">🤖 Ulasan AI</h3>
      </div>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Menggabungkan <strong>fundamental, teknikal, dan berita</strong> menjadi satu
        ulasan naratif. Pilih penyedia AI lalu klik buat.
      </p>

      {/* Provider selector + action */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                provider === p.key
                  ? "bg-white text-brand shadow-sm dark:bg-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={run} disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "Menganalisis…" : "Buatkan ulasan"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-down">{error}</p>}

      {data && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              {data.providerLabel ?? "AI"}
              {data.model ? ` · ${data.model}` : ""}
            </span>
            {data.enabled ? (
              <span className="text-brand">aktif</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">fallback non-AI</span>
            )}
          </div>
          {data.mock && (
            <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠️ Sebagian data adalah contoh (mock) — sumber live terbatas di lingkungan ini.
            </p>
          )}
          {!data.enabled && data.note && (
            <p className="mb-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              ℹ️ {data.note}
            </p>
          )}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {data.text}
          </div>
          {data.enabled && (
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              Dihasilkan oleh AI ({data.providerLabel}). Edukatif, bukan saran investasi.
            </p>
          )}
        </div>
      )}

      {!data && !loading && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Tip: bandingkan hasil antar penyedia AI dengan mengganti pilihan lalu klik lagi.
        </p>
      )}
    </div>
  );
}
