"use client";

import { useState } from "react";

interface Result {
  enabled: boolean;
  text: string;
  note?: string;
  mock?: boolean;
  model?: string;
}

export default function AiReview({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-review?symbol=${encodeURIComponent(symbol)}`);
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
        <h3 className="flex items-center gap-2 font-semibold">
          🤖 Ulasan AI
          <span className="rounded bg-brand/15 px-1.5 py-0.5 text-xs font-normal text-brand">
            gaya wealth management
          </span>
        </h3>
        <button onClick={run} disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "Menganalisis…" : data ? "Buat ulang" : "Buatkan ulasan"}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Menggabungkan <strong>fundamental, teknikal, dan berita</strong> menjadi satu
        ulasan naratif yang menimbang peluang &amp; risiko.
      </p>

      {error && (
        <p className="mt-3 text-sm text-down">{error}</p>
      )}

      {data && (
        <div className="mt-4">
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
          {data.enabled && data.model && (
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              Dihasilkan oleh AI ({data.model}). Edukatif, bukan saran investasi.
            </p>
          )}
        </div>
      )}

      {!data && !loading && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Klik “Buatkan ulasan” untuk menghasilkan analisis naratif terpadu.
        </p>
      )}
    </div>
  );
}
