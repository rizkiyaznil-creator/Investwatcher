import type { Candle } from "./types";
import {
  latestSma,
  latestRsi,
  latestMacd,
  latestBollinger,
} from "./indicators";

export type Signal = "buy" | "hold" | "sell";

export interface SignalItem {
  label: string;
  signal: Signal;
  note: string;
}

export interface SignalSummary {
  items: SignalItem[];
  /** Vote counts. */
  buy: number;
  hold: number;
  sell: number;
  /** Percentages (sum ~100). */
  buyPct: number;
  holdPct: number;
  sellPct: number;
  /** Net score in [-1, 1]. */
  score: number;
  /** Verdict label in Indonesian. */
  verdict: "Beli Kuat" | "Beli" | "Tahan" | "Jual" | "Jual Kuat" | "—";
}

function lastClose(candles: Candle[]): number | null {
  return candles.length ? candles[candles.length - 1].close : null;
}

function periodReturnPct(candles: Candle[], days: number): number | null {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const targetTime = last.time - days * 86400;
  let past: number | null = null;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= targetTime) {
      past = candles[i].close;
      break;
    }
  }
  if (past == null || past === 0) return null;
  return (last.close / past - 1) * 100;
}

/**
 * Aggregate several classic technical signals into a buy/hold/sell summary.
 * Educational only — not investment advice.
 */
export function evaluateSignals(candles: Candle[]): SignalSummary {
  const items: SignalItem[] = [];
  const price = lastClose(candles);

  const add = (label: string, signal: Signal, note: string) =>
    items.push({ label, signal, note });

  if (price != null) {
    const ma20 = latestSma(candles, 20);
    const ma50 = latestSma(candles, 50);
    const ma200 = latestSma(candles, 200);
    if (ma20 != null) {
      add(
        "Harga vs MA20",
        price > ma20 ? "buy" : price < ma20 ? "sell" : "hold",
        price > ma20 ? "Di atas MA20 (tren naik jangka pendek)" : "Di bawah MA20",
      );
    }
    if (ma50 != null) {
      add(
        "Harga vs MA50",
        price > ma50 ? "buy" : price < ma50 ? "sell" : "hold",
        price > ma50 ? "Di atas MA50 (tren naik menengah)" : "Di bawah MA50",
      );
    }
    if (ma20 != null && ma50 != null) {
      add(
        "MA20 vs MA50",
        ma20 > ma50 ? "buy" : ma20 < ma50 ? "sell" : "hold",
        ma20 > ma50 ? "Golden cross (MA20 di atas MA50)" : "Death cross (MA20 di bawah MA50)",
      );
    }
    if (ma200 != null) {
      add(
        "Harga vs MA200",
        price > ma200 ? "buy" : price < ma200 ? "sell" : "hold",
        price > ma200
          ? "Di atas MA200 (fase bullish jangka panjang)"
          : "Di bawah MA200 (fase bearish jangka panjang)",
      );
    }
    if (ma50 != null && ma200 != null) {
      add(
        "MA50 vs MA200",
        ma50 > ma200 ? "buy" : ma50 < ma200 ? "sell" : "hold",
        ma50 > ma200
          ? "Golden cross jangka panjang (MA50 di atas MA200)"
          : "Death cross jangka panjang (MA50 di bawah MA200)",
      );
    }
  }

  const rsi = latestRsi(candles, 14);
  if (rsi != null) {
    add(
      "RSI (14)",
      rsi < 30 ? "buy" : rsi > 70 ? "sell" : "hold",
      rsi < 30
        ? `Jenuh jual (${rsi.toFixed(0)})`
        : rsi > 70
          ? `Jenuh beli (${rsi.toFixed(0)})`
          : `Netral (${rsi.toFixed(0)})`,
    );
  }

  const macd = latestMacd(candles);
  if (macd) {
    const diff = macd.macd - macd.signal;
    add(
      "MACD",
      diff > 0 ? "buy" : diff < 0 ? "sell" : "hold",
      diff > 0 ? "MACD di atas garis sinyal" : "MACD di bawah garis sinyal",
    );
  }

  const bb = latestBollinger(candles, 20, 2);
  if (bb && price != null) {
    add(
      "Bollinger Bands",
      price < bb.lower ? "buy" : price > bb.upper ? "sell" : "hold",
      price < bb.lower
        ? "Di bawah pita bawah (oversold)"
        : price > bb.upper
          ? "Di atas pita atas (overbought)"
          : "Di dalam pita (normal)",
    );
  }

  const mom = periodReturnPct(candles, 30);
  if (mom != null) {
    add(
      "Momentum 1 bulan",
      mom > 1 ? "buy" : mom < -1 ? "sell" : "hold",
      `${mom > 0 ? "+" : ""}${mom.toFixed(1)}% dalam 30 hari`,
    );
  }

  const buy = items.filter((i) => i.signal === "buy").length;
  const sell = items.filter((i) => i.signal === "sell").length;
  const hold = items.filter((i) => i.signal === "hold").length;
  const total = items.length;

  let buyPct = 0,
    holdPct = 0,
    sellPct = 0;
  if (total > 0) {
    buyPct = Math.round((buy / total) * 100);
    sellPct = Math.round((sell / total) * 100);
    holdPct = 100 - buyPct - sellPct; // keep sum at 100
  }

  const score = total > 0 ? (buy - sell) / total : 0;
  let verdict: SignalSummary["verdict"] = "—";
  if (total > 0) {
    if (score >= 0.5) verdict = "Beli Kuat";
    else if (score >= 0.2) verdict = "Beli";
    else if (score > -0.2) verdict = "Tahan";
    else if (score > -0.5) verdict = "Jual";
    else verdict = "Jual Kuat";
  }

  return { items, buy, hold, sell, buyPct, holdPct, sellPct, score, verdict };
}
