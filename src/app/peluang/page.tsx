"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import InfoTip from "@/components/InfoTip";
import ScalpingSignals from "@/components/ScalpingSignals";
import type { ScoredStock } from "@/lib/screener";

type Market = "all" | "us" | "id";
type Style = "balanced" | "deepvalue" | "garp";

interface ScreenerResp {
  available: boolean;
  mock?: boolean;
  scanned: number;
  results: ScoredStock[];
}
interface Thesis {
  thesis: string;
  risk: string;
}
interface ThesisResp {
  enabled: boolean;
  providerLabel?: string;
  note?: string;
  theses: Record<string, Thesis>;
}

const MARKETS: { id: Market; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "us", label: "🇺🇸 US" },
  { id: "id", label: "🇮🇩 Indonesia" },
];
const STYLES: { id: Style; label: string; tip: string }[] = [
  { id: "balanced", label: "Seimbang", tip: "Murah + berkualitas + ada potensi naik. Paling aman dari value trap." },
  { id: "deepvalue", label: "Deep Value", tip: "Utamakan termurah (P/E, P/B, PEG). Lebih agresif." },
  { id: "garp", label: "GARP", tip: "Pertumbuhan kuat dengan valuasi masih wajar." },
];
const PROVIDERS = [
  { id: "claude", label: "Claude" },
  { id: "deepseek-chat", label: "DeepSeek V3" },
  { id: "deepseek-reasoner", label: "DeepSeek R1" },
];
const TOP_AI = 8;

function pct(n?: number) {
  return n == null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
}
function fracPct(n?: number) {
  return n == null ? "n/a" : `${(n * 100).toFixed(0)}%`;
}
function scoreColor(s: number) {
  if (s >= 75) return "text-up";
  if (s >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

export default function PeluangPage() {
  const [market, setMarket] = useState<Market>("all");
  const [style, setStyle] = useState<Style>("balanced");
  const [provider, setProvider] = useState("claude");
  const [data, setData] = useState<ScreenerResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [theses, setTheses] = useState<ThesisResp | null>(null);
  const [thesisLoading, setThesisLoading] = useState(false);

  const loadThesis = useCallback(
    (results: ScoredStock[]) => {
      const top = results.slice(0, TOP_AI).map((r) => r.symbol);
      if (top.length === 0) return;
      setThesisLoading(true);
      setTheses(null);
      fetch(`/api/screener/thesis?symbols=${encodeURIComponent(top.join(","))}&style=${style}&provider=${provider}`)
        .then((r) => r.json())
        .then((d: ThesisResp) => setTheses(d))
        .catch(() => {})
        .finally(() => setThesisLoading(false));
    },
    [style, provider],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTheses(null);
    fetch(`/api/screener?market=${market}&style=${style}`)
      .then((r) => r.json())
      .then((d: ScreenerResp) => {
        if (cancelled) return;
        setData(d);
        if (d.results?.length) loadThesis(d.results);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [market, style, loadThesis]);

  const results = data?.results ?? [];

  return (
    <div className="space-y-5">
      {/* Quick-access intraday scalping/day-trading signals (IDX) */}
      <ScalpingSignals />

      <div>
        <h1 className="text-2xl font-bold">💎 Peluang — Saham Undervalued</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Penyaring otomatis saham yang relatif <strong>murah</strong>, <strong>berkualitas</strong>, dan punya{" "}
          <strong>potensi naik</strong> — dari ~80 saham besar US &amp; Indonesia. Lalu {TOP_AI} teratas diberi tesis AI singkat.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                market === m.id ? "bg-white text-brand shadow-sm dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              title={s.tip}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                style === s.id ? "bg-white text-brand shadow-sm dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          title="Model AI untuk tesis Top 8"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              AI: {p.label}
            </option>
          ))}
        </select>
      </div>

      {data?.mock && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Angka contoh (mock) — sumber live terbatas di lingkungan ini. Di produksi datanya realtime dari Yahoo.
        </p>
      )}

      {loading ? (
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">Memindai ~80 saham…</div>
      ) : results.length === 0 ? (
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">Tidak ada hasil.</div>
      ) : (
        <ul className="space-y-3">
          {results.map((s, i) => {
            const t = theses?.theses?.[s.symbol];
            return (
              <li key={s.symbol} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 shrink-0 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <Link href={`/asset/${encodeURIComponent(s.symbol)}`} className="min-w-0">
                        <span className="font-semibold text-slate-800 hover:text-brand dark:text-slate-100">
                          {s.market === "id" ? "🇮🇩" : "🇺🇸"} {s.name}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                          {s.symbol} · {s.sector ?? "—"}
                        </span>
                      </Link>
                      <div className="text-right">
                        <span className={`text-xl font-bold tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
                        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">/100</span>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                      {s.price != null && <span className="font-medium">{formatPrice(s.price, s.currency ?? "USD")}</span>}
                      <span>P/E {s.pe != null ? s.pe.toFixed(1) : "n/a"}</span>
                      <span>ROE {fracPct(s.returnOnEquity)}</span>
                      <span className={s.analystUpsidePct != null && s.analystUpsidePct > 0 ? "text-up" : ""}>
                        Upside {pct(s.analystUpsidePct)}
                      </span>
                      {s.dividendYield != null && s.dividendYield > 0 && <span>Yield {fracPct(s.dividendYield)}</span>}
                    </div>

                    <div className="mt-2 grid max-w-md gap-1">
                      <Bar label="Value" value={s.valueScore} />
                      <Bar label="Kualitas" value={s.qualityScore} />
                      <Bar label="Upside" value={s.upsideScore} />
                    </div>

                    {s.reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.reasons.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {i < TOP_AI && (
                      <div className="mt-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                        {t ? (
                          <>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-brand">🤖 Tesis:</span> {t.thesis}
                            </p>
                            {t.risk && (
                              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                                <span className="font-medium">⚠️ Risiko:</span> {t.risk}
                              </p>
                            )}
                          </>
                        ) : thesisLoading ? (
                          <p className="text-slate-400 dark:text-slate-500">🤖 Menyusun tesis AI…</p>
                        ) : theses && !theses.enabled ? (
                          <p className="text-slate-400 dark:text-slate-500">ℹ️ {theses.note ?? "Tesis AI tidak tersedia."}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="card p-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-600 dark:text-slate-300">Cara membaca</p>
        <p className="mt-1">
          Skor 0–100 menggabungkan <strong>Value</strong> (P/E, P/B, PEG, yield), <strong>Kualitas</strong> (ROE, margin,
          pertumbuhan, utang), dan <strong>Upside</strong> (target analis, posisi 52mg, rekomendasi). Universe ~80 saham
          besar/likuid (bukan seluruh bursa), data dari Yahoo (pihak ketiga, bisa telat/keliru).
        </p>
        <p className="mt-2">
          <InfoTip text="Saham yang terlihat murah bisa murah karena alasan fundamental yang memburuk — bukan diskon sementara.">
            ⚠️ Waspadai &quot;value trap&quot;
          </InfoTip>
          . Ini penyaring <strong>edukatif</strong>, bukan saran investasi. Selalu riset mandiri.
        </p>
      </div>
    </div>
  );
}
