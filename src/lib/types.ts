export type AssetType =
  | "commodity"
  | "stock_us"
  | "stock_id"
  | "gold_antam"
  | "fx"
  | "crypto"
  | "index"
  | "etf"
  | "other";

export interface Asset {
  /** Yahoo Finance symbol (or synthetic id for non-Yahoo sources like Antam). */
  symbol: string;
  /** Human friendly name. */
  name: string;
  /** Short label shown in tables. */
  short: string;
  type: AssetType;
  /** Currency the price is quoted in. */
  currency: "USD" | "IDR";
  /** Unit description, e.g. "per ons troy", "per gram", "per saham". */
  unit?: string;
  /** Emoji / icon hint. */
  icon?: string;
  category: string;
}

export interface Quote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  high52?: number;
  low52?: number;
  /** Recent closes for a sparkline (oldest -> newest). */
  spark?: number[];
  /** Extra info for Antam gold. */
  buyback?: number;
  spread?: number;
  marketTime?: number;
  /** True when served from mock fallback instead of live data. */
  mock?: boolean;
  /** True when derived from a proxy (e.g. Antam estimated from world gold). */
  estimated?: boolean;
  /** Optional human note about the data source. */
  note?: string;
}

export interface Candle {
  /** Unix timestamp (seconds). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HistoryResponse {
  symbol: string;
  range: RangeKey;
  candles: Candle[];
  mock?: boolean;
  /** True when derived from a proxy series (e.g. Antam from world gold). */
  estimated?: boolean;
}

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";
