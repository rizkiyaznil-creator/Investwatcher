"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Candle, Quote, RangeKey } from "@/lib/types";
import { useCatalog } from "@/components/CatalogContext";
import { sma, rsi, latestRsi, type LinePoint } from "@/lib/indicators";
import {
  changeColor,
  formatChange,
  formatPercent,
  formatPrice,
  rangePosition,
} from "@/lib/format";
import { useCurrency } from "@/components/CurrencyContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import PriceChart, { type Overlay } from "@/components/PriceChart";
import RsiChart from "@/components/RsiChart";
import AlertPanel from "@/components/AlertPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import AiReview from "@/components/AiReview";
import FundamentalRatios from "@/components/FundamentalRatios";
import FinancialStatements from "@/components/FinancialStatements";
import EarningsDividend from "@/components/EarningsDividend";
import ValuationPeers from "@/components/ValuationPeers";
import MacroContext from "@/components/MacroContext";
import NewsPanel from "@/components/NewsPanel";
import InfoTip from "@/components/InfoTip";

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];
const INTRADAY: RangeKey[] = ["1D", "1W"];

export default function AssetDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(
    Array.isArray(params.symbol) ? params.symbol[0] : params.symbol,
  );
  const { resolve } = useCatalog();
  const asset = resolve(symbol);
  const { convert } = useCurrency();
  const { has, add, remove } = useWatchlist();

  const [range, setRange] = useState<RangeKey>("3M");
  const [chartType, setChartType] = useState<"area" | "candlestick">("area");
  const [showMA, setShowMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quotes?symbols=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setQuote(d.quotes?.[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCandles(d.candles ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const overlays: Overlay[] = useMemo(() => {
    if (!showMA || candles.length === 0) return [];
    const out: Overlay[] = [];
    const ma20 = sma(candles, 20);
    const ma50 = sma(candles, 50);
    if (ma20.length) out.push({ label: "MA20", color: "#3b82f6", data: ma20 });
    if (ma50.length) out.push({ label: "MA50", color: "#f59e0b", data: ma50 });
    return out;
  }, [showMA, candles]);

  const rsiData: LinePoint[] = useMemo(
    () => (showRSI ? rsi(candles, 14) : []),
    [showRSI, candles],
  );
  const rsiNow = useMemo(() => latestRsi(candles, 14), [candles]);

  const disp = quote ? convert(quote.price, quote.currency) : null;
  const pos = quote ? rangePosition(quote) : null;
  const inList = has(symbol);

  if (!asset) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600 dark:text-slate-300">Aset tidak dikenal: {symbol}</p>
        <Link href="/" className="btn-primary mt-4">
          ← Kembali ke dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{asset.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {asset.symbol} · {asset.category}
              {asset.unit ? ` · ${asset.unit}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => (inList ? remove(symbol) : add(symbol))}
          className={inList ? "btn-ghost border border-slate-300 dark:border-slate-700" : "btn-primary"}
        >
          {inList ? "★ Di watchlist" : "☆ Tambah ke watchlist"}
        </button>
      </div>

      {/* Price summary */}
      <div className="card p-5">
        {disp ? (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {formatPrice(disp.value, disp.currency)}
              </div>
              {quote && (
                <div
                  className={`mt-1 text-sm tabular-nums ${changeColor(quote.changePercent)}`}
                >
                  {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    <InfoTip text="Selisih harga dibanding penutupan hari perdagangan sebelumnya.">
                      hari ini
                    </InfoTip>
                  </span>
                </div>
              )}
            </div>

            {quote?.high52 != null && quote?.low52 != null && (
              <div className="min-w-[180px]">
                <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <InfoTip text="Rentang harga selama 52 minggu terakhir. Titik hijau menunjukkan posisi harga sekarang: dekat L = relatif murah, dekat H = relatif mahal.">
                    52mg Rendah
                  </InfoTip>
                  <span>52mg Tinggi</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                  {pos != null && (
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-900 bg-brand"
                      style={{ left: `${pos}%` }}
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  <span>{formatPrice(quote.low52, quote.currency)}</span>
                  <span>{formatPrice(quote.high52, quote.currency)}</span>
                </div>
              </div>
            )}

            {quote?.buyback != null && (
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm">
                <div className="text-slate-500 dark:text-slate-400">
                  <InfoTip text="Harga saat Anda menjual emas kembali ke Antam — biasanya lebih rendah dari harga beli.">
                    Buyback
                  </InfoTip>
                </div>
                <div className="font-medium tabular-nums">
                  {formatPrice(quote.buyback, quote.currency)}
                </div>
                {quote.spread != null && (
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    <InfoTip text="Selisih harga beli dan buyback. Ini biaya yang Anda tanggung saat membeli lalu menjual emas.">
                      Spread
                    </InfoTip>{" "}
                    {formatPrice(quote.spread, quote.currency)}
                  </div>
                )}
              </div>
            )}

            {rsiNow != null && (
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm">
                <div className="text-slate-500 dark:text-slate-400">
                  <InfoTip text="Relative Strength Index (14 periode), indikator momentum 0–100. Di atas 70 = jenuh beli (mungkin terlalu mahal), di bawah 30 = jenuh jual (mungkin terlalu murah).">
                    RSI (14)
                  </InfoTip>
                </div>
                <div
                  className={`font-medium tabular-nums ${
                    rsiNow >= 70
                      ? "text-down"
                      : rsiNow <= 30
                        ? "text-up"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {rsiNow.toFixed(1)}{" "}
                  <span className="text-xs">
                    {rsiNow >= 70
                      ? "(jenuh beli)"
                      : rsiNow <= 30
                        ? "(jenuh jual)"
                        : "(netral)"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-500 dark:text-slate-400">Memuat data harga…</div>
        )}
        {quote?.mock && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ Data contoh (mock) — sumber live belum dapat diakses dari
            lingkungan ini.
          </p>
        )}
        {!quote?.mock && quote?.estimated && quote?.note && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">ℹ️ {quote.note}</p>
        )}
      </div>

      {/* Unified analysis: recommendation + performance/risk + seasonality */}
      <AnalysisPanel symbol={symbol} />

      {/* AI narrative review (fundamental + technical + news) */}
      <AiReview symbol={symbol} />

      {/* Macro backdrop (rates, dollar, related markets) */}
      <MacroContext symbol={symbol} />

      {/* Valuation & fundamental ratios (all stocks; hidden for non-stocks) */}
      <FundamentalRatios symbol={symbol} currentPrice={quote?.price} currency={quote?.currency} />

      {/* Relative valuation vs peer group (hidden when no peer group) */}
      <ValuationPeers symbol={symbol} />

      {/* Financial statements (stocks only; hidden otherwise) */}
      <FinancialStatements symbol={symbol} />

      {/* Earnings & dividend calendar (stocks only; hidden otherwise) */}
      <EarningsDividend symbol={symbol} />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                range === r ? "bg-brand text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle active={chartType === "candlestick"} onClick={() => setChartType((t) => (t === "area" ? "candlestick" : "area"))}>
            {chartType === "candlestick" ? "Candlestick" : "Garis"}
          </Toggle>
          <Toggle active={showMA} onClick={() => setShowMA((v) => !v)}>
            MA 20/50
          </Toggle>
          <Toggle active={showRSI} onClick={() => setShowRSI((v) => !v)}>
            RSI
          </Toggle>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4">
        {loading && candles.length === 0 ? (
          <div className="flex h-[380px] items-center justify-center text-slate-500 dark:text-slate-400">
            Memuat grafik…
          </div>
        ) : (
          <PriceChart
            candles={candles}
            type={chartType}
            overlays={overlays}
            intraday={INTRADAY.includes(range)}
          />
        )}
        {showMA && (
          <div className="mt-2 flex items-center gap-4 px-1 text-xs text-slate-500 dark:text-slate-400">
            <InfoTip text="Moving Average / rata-rata harga selama 20 & 50 periode. Garis ini memuluskan fluktuasi untuk melihat arah tren; perpotongan MA sering dipakai sebagai sinyal.">
              <span className="font-medium">MA</span>
            </InfoTip>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded bg-[#3b82f6]" /> MA20
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded bg-[#f59e0b]" /> MA50
            </span>
          </div>
        )}
      </div>

      {showRSI && (
        <div className="card p-4">
          <div className="mb-1 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            RSI (14) — di atas 70 jenuh beli, di bawah 30 jenuh jual
          </div>
          <RsiChart data={rsiData} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <AlertPanel symbol={symbol} currentPrice={quote?.price} />
        <NewsPanel symbol={symbol} />
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand bg-brand/15 text-brand"
          : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
