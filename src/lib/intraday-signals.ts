import type { Candle } from "./types";
import { ema, latestRsi, latestMacd } from "./indicators";

export type Signal = "buy" | "hold" | "sell";

export interface IntradaySignalItem {
  label: string;
  signal: Signal;
  note: string;
}

export interface IntradaySignals {
  available: boolean;
  items: IntradaySignalItem[];
  buyPct: number;
  holdPct: number;
  sellPct: number;
  score: number;
  verdict: "Beli Kuat" | "Beli" | "Tahan" | "Jual" | "Jual Kuat" | "—";
  ema9?: number;
  ema20?: number;
  rsi?: number;
}

function latestEma(candles: Candle[], period: number): number | undefined {
  const s = ema(candles, period);
  return s.length ? s[s.length - 1].value : undefined;
}

/**
 * Evaluate short-term (intraday) technical signals from 5-minute candles:
 * VWAP bias, EMA9/EMA20 trend & cross, RSI(14), MACD. Educational only.
 */
export function evaluateIntradaySignals(candles: Candle[], vwap?: number): IntradaySignals {
  const empty: IntradaySignals = {
    available: false,
    items: [],
    buyPct: 0,
    holdPct: 0,
    sellPct: 0,
    score: 0,
    verdict: "—",
  };
  if (candles.length < 20) return empty;

  const price = candles[candles.length - 1].close;
  const ema9 = latestEma(candles, 9);
  const ema20 = latestEma(candles, 20);
  const rsi = latestRsi(candles, 14) ?? undefined;

  const items: IntradaySignalItem[] = [];
  const add = (label: string, signal: Signal, note: string) => items.push({ label, signal, note });

  if (vwap != null) {
    add(
      "Harga vs VWAP",
      price > vwap ? "buy" : price < vwap ? "sell" : "hold",
      price > vwap ? "Di atas VWAP (bias beli intraday)" : "Di bawah VWAP (bias jual intraday)",
    );
  }
  if (ema9 != null) {
    add(
      "Harga vs EMA9",
      price > ema9 ? "buy" : price < ema9 ? "sell" : "hold",
      price > ema9 ? "Di atas EMA9 (momentum sangat pendek positif)" : "Di bawah EMA9",
    );
  }
  if (ema9 != null && ema20 != null) {
    add(
      "EMA9 vs EMA20",
      ema9 > ema20 ? "buy" : ema9 < ema20 ? "sell" : "hold",
      ema9 > ema20 ? "Golden cross 5m (EMA9 di atas EMA20)" : "Death cross 5m (EMA9 di bawah EMA20)",
    );
  }
  if (rsi != null) {
    add(
      "RSI(14) 5m",
      rsi < 30 ? "buy" : rsi > 70 ? "sell" : "hold",
      rsi < 30 ? `Jenuh jual (${rsi.toFixed(0)})` : rsi > 70 ? `Jenuh beli (${rsi.toFixed(0)})` : `Netral (${rsi.toFixed(0)})`,
    );
  }
  const macd = latestMacd(candles);
  if (macd) {
    const diff = macd.macd - macd.signal;
    add(
      "MACD 5m",
      diff > 0 ? "buy" : diff < 0 ? "sell" : "hold",
      diff > 0 ? "MACD di atas garis sinyal" : "MACD di bawah garis sinyal",
    );
  }

  const total = items.length;
  if (total === 0) return { ...empty, ema9, ema20, rsi };

  const buy = items.filter((i) => i.signal === "buy").length;
  const sell = items.filter((i) => i.signal === "sell").length;
  const buyPct = Math.round((buy / total) * 100);
  const sellPct = Math.round((sell / total) * 100);
  const holdPct = 100 - buyPct - sellPct;
  const score = (buy - sell) / total;

  let verdict: IntradaySignals["verdict"] = "Tahan";
  if (score >= 0.5) verdict = "Beli Kuat";
  else if (score >= 0.2) verdict = "Beli";
  else if (score > -0.2) verdict = "Tahan";
  else if (score > -0.5) verdict = "Jual";
  else verdict = "Jual Kuat";

  return { available: true, items, buyPct, holdPct, sellPct, score, verdict, ema9, ema20, rsi };
}
