import type { Asset } from "./types";

/**
 * Catalog of supported assets. Users build a watchlist from this catalog.
 * Yahoo Finance symbols: commodities use the futures continuous symbol (e.g. "GC=F"),
 * Indonesian stocks use the ".JK" suffix, FX uses "IDR=X".
 */
export const ASSETS: Asset[] = [
  // --- Komoditas dunia ---
  { symbol: "GC=F", name: "Emas (Gold Futures)", short: "Emas", type: "commodity", currency: "USD", unit: "per ons troy", icon: "🥇", category: "Logam Mulia" },
  { symbol: "SI=F", name: "Perak (Silver Futures)", short: "Perak", type: "commodity", currency: "USD", unit: "per ons troy", icon: "🥈", category: "Logam Mulia" },
  { symbol: "PL=F", name: "Platinum Futures", short: "Platinum", type: "commodity", currency: "USD", unit: "per ons troy", icon: "⚪", category: "Logam Mulia" },
  { symbol: "HG=F", name: "Tembaga (Copper Futures)", short: "Tembaga", type: "commodity", currency: "USD", unit: "per pon", icon: "🟤", category: "Logam Industri" },
  { symbol: "CL=F", name: "Minyak WTI", short: "WTI", type: "commodity", currency: "USD", unit: "per barel", icon: "🛢️", category: "Energi" },
  { symbol: "BZ=F", name: "Minyak Brent", short: "Brent", type: "commodity", currency: "USD", unit: "per barel", icon: "🛢️", category: "Energi" },
  { symbol: "NG=F", name: "Gas Alam (Natural Gas)", short: "Gas Alam", type: "commodity", currency: "USD", unit: "per MMBtu", icon: "🔥", category: "Energi" },
  { symbol: "ZC=F", name: "Jagung (Corn)", short: "Jagung", type: "commodity", currency: "USD", unit: "per bushel", icon: "🌽", category: "Agrikultur" },
  { symbol: "ZW=F", name: "Gandum (Wheat)", short: "Gandum", type: "commodity", currency: "USD", unit: "per bushel", icon: "🌾", category: "Agrikultur" },
  { symbol: "KC=F", name: "Kopi (Coffee)", short: "Kopi", type: "commodity", currency: "USD", unit: "per pon", icon: "☕", category: "Agrikultur" },

  // --- Emas Antam (sumber lokal, non-Yahoo) ---
  { symbol: "ANTAM-GOLD", name: "Emas Antam (Logam Mulia)", short: "Emas Antam", type: "gold_antam", currency: "IDR", unit: "per gram", icon: "🏅", category: "Logam Mulia" },

  // --- Saham US ---
  { symbol: "AAPL", name: "Apple Inc.", short: "AAPL", type: "stock_us", currency: "USD", unit: "per saham", icon: "🍎", category: "Saham US" },
  { symbol: "MSFT", name: "Microsoft Corp.", short: "MSFT", type: "stock_us", currency: "USD", unit: "per saham", icon: "🪟", category: "Saham US" },
  { symbol: "NVDA", name: "NVIDIA Corp.", short: "NVDA", type: "stock_us", currency: "USD", unit: "per saham", icon: "🟩", category: "Saham US" },
  { symbol: "GOOGL", name: "Alphabet Inc.", short: "GOOGL", type: "stock_us", currency: "USD", unit: "per saham", icon: "🔤", category: "Saham US" },
  { symbol: "AMZN", name: "Amazon.com Inc.", short: "AMZN", type: "stock_us", currency: "USD", unit: "per saham", icon: "📦", category: "Saham US" },
  { symbol: "TSLA", name: "Tesla Inc.", short: "TSLA", type: "stock_us", currency: "USD", unit: "per saham", icon: "🚗", category: "Saham US" },

  // --- Saham Indonesia ---
  { symbol: "BBCA.JK", name: "Bank Central Asia", short: "BBCA", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", short: "BBRI", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "TLKM.JK", name: "Telkom Indonesia", short: "TLKM", type: "stock_id", currency: "IDR", unit: "per saham", icon: "📡", category: "Saham Indonesia" },
  { symbol: "ASII.JK", name: "Astra International", short: "ASII", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🚙", category: "Saham Indonesia" },
  { symbol: "ANTM.JK", name: "Aneka Tambang (Antam)", short: "ANTM", type: "stock_id", currency: "IDR", unit: "per saham", icon: "⛏️", category: "Saham Indonesia" },
  { symbol: "GOTO.JK", name: "GoTo Gojek Tokopedia", short: "GOTO", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🛵", category: "Saham Indonesia" },

  // --- FX ---
  { symbol: "IDR=X", name: "USD / IDR", short: "USD/IDR", type: "fx", currency: "IDR", unit: "1 USD", icon: "💱", category: "Mata Uang" },
];

export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(
  ASSETS.map((a) => [a.symbol, a]),
);

export function getAsset(symbol: string): Asset | undefined {
  return ASSET_MAP[symbol];
}

/** Symbols shown by default for a brand-new user (no saved watchlist yet). */
export const DEFAULT_WATCHLIST: string[] = [
  "GC=F",
  "ANTAM-GOLD",
  "SI=F",
  "CL=F",
  "NG=F",
  "HG=F",
  "AAPL",
  "NVDA",
  "BBCA.JK",
  "BBRI.JK",
  "TLKM.JK",
  "IDR=X",
];

export const FX_USD_IDR_SYMBOL = "IDR=X";
