"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Quote } from "@/lib/types";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useCatalog } from "@/components/CatalogContext";
import { useCurrency } from "@/components/CurrencyContext";
import CurrencyToggle from "@/components/CurrencyToggle";
import AssetPicker from "@/components/AssetPicker";
import PortfolioTransfer from "@/components/PortfolioTransfer";
import { formatPrice, formatPercent } from "@/lib/format";
import { isIdx, LOT_SIZE } from "@/lib/idx";
import { colorAt } from "@/lib/colors";

const PROVIDERS = [
  { id: "claude", label: "Claude" },
  { id: "deepseek-chat", label: "DeepSeek V3" },
  { id: "deepseek-reasoner", label: "DeepSeek R1" },
];

interface Review {
  ringkasan: string;
  diversifikasi: string;
  konsentrasi: string;
  risiko: string[];
  saran: string[];
}
interface ReviewResp {
  enabled: boolean;
  providerLabel?: string;
  note?: string;
  review?: Review;
}

function marketOf(type: string): string {
  if (type === "stock_us") return "US";
  if (type === "stock_id") return "Indonesia";
  if (type === "crypto") return "Kripto";
  if (type === "commodity") return "Komoditas";
  if (type === "gold_antam") return "Emas";
  return type;
}

export default function PortfolioPage() {
  const { holdings, loaded, add, remove, replaceAll } = usePortfolio();
  const { resolve } = useCatalog();
  const { mode, rate } = useCurrency();
  const base = mode === "USD" ? "USD" : "IDR";

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);

  // Add-holding form state
  const [pending, setPending] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  // AI review state
  const [provider, setProvider] = useState("claude");
  const [review, setReview] = useState<ReviewResp | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const symbols = holdings.map((h) => h.symbol);

  const fetchQuotes = useCallback((syms: string[]) => {
    if (syms.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    fetch(`/api/quotes?symbols=${encodeURIComponent(syms.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Quote> = {};
        for (const q of (d.quotes as Quote[]) ?? []) map[q.symbol] = q;
        setQuotes(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loaded) fetchQuotes(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, holdings.length]);

  const toBase = useCallback(
    (value: number, native: string) => {
      if (native === base) return value;
      if (native === "USD" && base === "IDR") return value * rate;
      if (native === "IDR" && base === "USD") return value / rate;
      return value;
    },
    [base, rate],
  );

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const asset = resolve(h.symbol);
      const q = quotes[h.symbol];
      const native = q?.currency ?? asset.currency;
      const price = q?.price;
      const valueNative = price != null ? price * h.shares : undefined;
      const costNative = h.avgPrice * h.shares;
      const plNative = valueNative != null ? valueNative - costNative : undefined;
      const plPct = valueNative != null && costNative > 0 ? (valueNative / costNative - 1) * 100 : undefined;
      const valueBase = valueNative != null ? toBase(valueNative, native) : undefined;
      return { h, asset, q, native, price, valueNative, costNative, plNative, plPct, valueBase };
    });
  }, [holdings, quotes, resolve, toBase]);

  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    let dayPl = 0;
    let known = false;
    for (const r of rows) {
      if (r.valueBase == null) continue;
      known = true;
      value += r.valueBase;
      cost += toBase(r.costNative, r.native);
      if (r.q) dayPl += (r.valueBase * r.q.changePercent) / 100;
    }
    const pl = value - cost;
    const plPct = cost > 0 ? (value / cost - 1) * 100 : undefined;
    return { value, cost, pl, plPct, dayPl, known };
  }, [rows, toBase]);

  const sortedByWeight = useMemo(
    () => [...rows].filter((r) => r.valueBase != null).sort((a, b) => (b.valueBase ?? 0) - (a.valueBase ?? 0)),
    [rows],
  );

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    const idx = isIdx(pending);
    const q = Number(qty.replace(/,/g, ""));
    const p = Number(price.replace(/,/g, ""));
    const shares = idx ? q * LOT_SIZE : q;
    if (!(shares > 0) || !(p > 0)) return;
    add(pending, shares, p);
    setPending(null);
    setQty("");
    setPrice("");
  };

  const runReview = () => {
    setReviewLoading(true);
    setReview(null);
    const payloadHoldings = sortedByWeight.map((r) => ({
      symbol: r.h.symbol,
      name: r.asset.short,
      market: marketOf(r.asset.type),
      category: r.asset.category,
      weightPct: totals.value > 0 && r.valueBase != null ? (r.valueBase / totals.value) * 100 : undefined,
      plPct: r.plPct,
    }));
    fetch(`/api/portfolio-review?provider=${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalValue: totals.value,
        currency: base,
        totalPlPct: totals.plPct,
        holdings: payloadHoldings,
      }),
    })
      .then((r) => r.json())
      .then((d: ReviewResp) => setReview(d))
      .catch(() => setReview({ enabled: false, note: "Gagal memanggil AI." }))
      .finally(() => setReviewLoading(false));
  };

  const plClass = (v?: number) => (v == null ? "" : v >= 0 ? "text-up" : "text-down");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">💼 Portofolio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catat kepemilikan Anda untuk melihat nilai, untung/rugi, alokasi, dan review AI. Tersimpan di perangkat ini.
          </p>
        </div>
        <CurrencyToggle />
      </div>

      {/* Totals */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Nilai sekarang" value={formatPrice(totals.value, base)} />
          <Card label="Modal" value={formatPrice(totals.cost, base)} />
          <Card label="Untung/Rugi" value={`${totals.pl >= 0 ? "+" : ""}${formatPrice(totals.pl, base)}`} sub={totals.plPct != null ? formatPercent(totals.plPct) : undefined} cls={plClass(totals.pl)} />
          <Card label="Perubahan hari ini" value={`${totals.dayPl >= 0 ? "+" : ""}${formatPrice(totals.dayPl, base)}`} cls={plClass(totals.dayPl)} />
        </div>
      )}

      {/* Add holding */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Tambah kepemilikan</h3>
        {pending ? (
          <form onSubmit={submitAdd} className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Aset</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-semibold">{resolve(pending).short}</span>
                <button type="button" onClick={() => setPending(null)} className="text-xs text-slate-400 hover:text-down">ganti</button>
              </div>
              {(() => {
                const ex = holdings.find((h) => h.symbol === pending);
                if (!ex) return null;
                const lots = isIdx(pending) ? `${ex.shares / LOT_SIZE} lot` : `${ex.shares} saham`;
                return (
                  <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Sudah dimiliki: {lots} @ {formatPrice(ex.avgPrice, resolve(pending).currency)} — pembelian ini akan dirata-ratakan.
                  </div>
                );
              })()}
            </div>
            <label className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">{isIdx(pending) ? "Jumlah (lot)" : "Jumlah (saham)"}</span>
              <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder={isIdx(pending) ? "mis. 10 lot" : "mis. 100"} className="mt-1 w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">Harga beli rata-rata ({resolve(pending).currency})</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="mis. 4500" className="mt-1 w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <button type="submit" className="btn-primary">Tambah</button>
          </form>
        ) : (
          <AssetPicker
            inWatchlist={symbols}
            onAdd={(s) => setPending(s)}
            disableExisting={false}
            existingLabel="+ tambah lot"
          />
        )}
      </div>

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          Portofolio kosong. Tambah kepemilikan di atas untuk mulai melacak.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-3 font-medium">Aset</th>
                <th className="px-3 py-3 text-right font-medium">Jumlah</th>
                <th className="px-3 py-3 text-right font-medium">Harga beli</th>
                <th className="px-3 py-3 text-right font-medium">Harga kini</th>
                <th className="px-3 py-3 text-right font-medium">Nilai</th>
                <th className="px-3 py-3 text-right font-medium">U/R</th>
                <th className="px-3 py-3 text-right font-medium">Bobot</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => {
                const weight = totals.value > 0 && r.valueBase != null ? (r.valueBase / totals.value) * 100 : undefined;
                const lots = isIdx(r.h.symbol) ? r.h.shares / LOT_SIZE : null;
                return (
                  <tr key={r.h.symbol} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="px-3 py-2">
                      <Link href={`/asset/${encodeURIComponent(r.h.symbol)}`} className="font-medium hover:text-brand">
                        {r.asset.icon} {r.asset.short}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right">{lots != null ? `${lots} lot` : r.h.shares}</td>
                    <td className="px-3 py-2 text-right">{formatPrice(r.h.avgPrice, r.native)}</td>
                    <td className="px-3 py-2 text-right">{r.price != null ? formatPrice(r.price, r.native) : loading ? "…" : "—"}</td>
                    <td className="px-3 py-2 text-right">{r.valueNative != null ? formatPrice(r.valueNative, r.native) : "—"}</td>
                    <td className={`px-3 py-2 text-right ${plClass(r.plNative)}`}>
                      {r.plPct != null ? (
                        <>
                          {r.plPct >= 0 ? "+" : ""}
                          {r.plPct.toFixed(1)}%
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{weight != null ? `${weight.toFixed(0)}%` : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(r.h.symbol)} className="text-slate-400 hover:text-down" title="Hapus">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Allocation */}
      {sortedByWeight.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Alokasi</h3>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {sortedByWeight.map((r, i) => {
              const w = totals.value > 0 && r.valueBase != null ? (r.valueBase / totals.value) * 100 : 0;
              return <div key={r.h.symbol} style={{ width: `${w}%`, backgroundColor: colorAt(i) }} title={`${r.asset.short} ${w.toFixed(0)}%`} />;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {sortedByWeight.map((r, i) => {
              const w = totals.value > 0 && r.valueBase != null ? (r.valueBase / totals.value) * 100 : 0;
              return (
                <span key={r.h.symbol} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-3 rounded" style={{ backgroundColor: colorAt(i) }} />
                  <span className="text-slate-600 dark:text-slate-300">{r.asset.short}</span>
                  <span className="text-slate-400 dark:text-slate-500">{w.toFixed(0)}%</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* AI review */}
      {holdings.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">🤖 Review Portofolio (AI)</h2>
            <div className="flex items-center gap-2">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>AI: {p.label}</option>
                ))}
              </select>
              <button onClick={runReview} disabled={reviewLoading} className="btn-primary text-sm">
                {reviewLoading ? "Menganalisis…" : "Analisis"}
              </button>
            </div>
          </div>

          {review && !review.enabled && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">ℹ️ {review.note ?? "Review AI tidak tersedia."}</p>
          )}
          {review?.enabled && review.review && (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-slate-700 dark:text-slate-200">{review.review.ringkasan}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Block title="Diversifikasi" text={review.review.diversifikasi} />
                <Block title="Konsentrasi" text={review.review.konsentrasi} />
              </div>
              {review.review.risiko.length > 0 && (
                <ListBlock title="⚠️ Risiko" items={review.review.risiko} />
              )}
              {review.review.saran.length > 0 && (
                <ListBlock title="💡 Saran" items={review.review.saran} />
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Dihasilkan AI dari ringkasan portofolio Anda. Edukatif, bukan saran investasi personal.
              </p>
            </div>
          )}
          {!review && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Klik <strong>Analisis</strong> untuk mendapat ulasan diversifikasi, konsentrasi risiko, dan saran umum.
            </p>
          )}
        </div>
      )}

      <PortfolioTransfer
        holdings={holdings}
        onMerge={(list) => list.forEach((h) => add(h.symbol, h.shares, h.avgPrice))}
        onReplace={(list) => replaceAll(list)}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Nilai gabungan dikonversi ke {base} (kurs USD/IDR ~{Math.round(rate).toLocaleString("id-ID")}). Data harga dari Yahoo
        (pihak ketiga, bisa telat). Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}

function Card({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-bold tabular-nums ${cls ?? ""}`}>{value}</div>
      {sub && <div className={`text-xs tabular-nums ${cls ?? ""}`}>{sub}</div>}
    </div>
  );
}
function Block({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</div>
      <p className="mt-1 text-slate-700 dark:text-slate-200">{text}</p>
    </div>
  );
}
function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-600 dark:text-slate-300">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
