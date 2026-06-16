import type { Asset, AssetType } from "./types";

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
  { symbol: "PA=F", name: "Paladium (Palladium)", short: "Paladium", type: "commodity", currency: "USD", unit: "per ons troy", icon: "⚙️", category: "Logam Mulia" },
  { symbol: "RB=F", name: "Bensin (RBOB Gasoline)", short: "Bensin", type: "commodity", currency: "USD", unit: "per galon", icon: "⛽", category: "Energi" },
  { symbol: "ZS=F", name: "Kedelai (Soybean)", short: "Kedelai", type: "commodity", currency: "USD", unit: "per bushel", icon: "🫘", category: "Agrikultur" },
  { symbol: "SB=F", name: "Gula (Sugar)", short: "Gula", type: "commodity", currency: "USD", unit: "per pon", icon: "🍬", category: "Agrikultur" },
  { symbol: "CC=F", name: "Kakao (Cocoa)", short: "Kakao", type: "commodity", currency: "USD", unit: "per ton", icon: "🍫", category: "Agrikultur" },
  { symbol: "CT=F", name: "Kapas (Cotton)", short: "Kapas", type: "commodity", currency: "USD", unit: "per pon", icon: "🧶", category: "Agrikultur" },

  // --- Emas Antam (sumber lokal, non-Yahoo) ---
  { symbol: "ANTAM-GOLD", name: "Emas Antam (Logam Mulia)", short: "Emas Antam", type: "gold_antam", currency: "IDR", unit: "per gram", icon: "🏅", category: "Logam Mulia" },

  // --- Saham US ---
  { symbol: "AAPL", name: "Apple Inc.", short: "AAPL", type: "stock_us", currency: "USD", unit: "per saham", icon: "🍎", category: "Saham US" },
  { symbol: "MSFT", name: "Microsoft Corp.", short: "MSFT", type: "stock_us", currency: "USD", unit: "per saham", icon: "🪟", category: "Saham US" },
  { symbol: "NVDA", name: "NVIDIA Corp.", short: "NVDA", type: "stock_us", currency: "USD", unit: "per saham", icon: "🟩", category: "Saham US" },
  { symbol: "GOOGL", name: "Alphabet Inc.", short: "GOOGL", type: "stock_us", currency: "USD", unit: "per saham", icon: "🔤", category: "Saham US" },
  { symbol: "AMZN", name: "Amazon.com Inc.", short: "AMZN", type: "stock_us", currency: "USD", unit: "per saham", icon: "📦", category: "Saham US" },
  { symbol: "TSLA", name: "Tesla Inc.", short: "TSLA", type: "stock_us", currency: "USD", unit: "per saham", icon: "🚗", category: "Saham US" },
  { symbol: "META", name: "Meta Platforms", short: "META", type: "stock_us", currency: "USD", unit: "per saham", icon: "📘", category: "Saham US" },
  { symbol: "AMD", name: "AMD", short: "AMD", type: "stock_us", currency: "USD", unit: "per saham", icon: "🔴", category: "Saham US" },
  { symbol: "NFLX", name: "Netflix Inc.", short: "NFLX", type: "stock_us", currency: "USD", unit: "per saham", icon: "🎬", category: "Saham US" },
  { symbol: "JPM", name: "JPMorgan Chase", short: "JPM", type: "stock_us", currency: "USD", unit: "per saham", icon: "🏦", category: "Saham US" },
  { symbol: "V", name: "Visa Inc.", short: "V", type: "stock_us", currency: "USD", unit: "per saham", icon: "💳", category: "Saham US" },
  { symbol: "KO", name: "Coca-Cola Co.", short: "KO", type: "stock_us", currency: "USD", unit: "per saham", icon: "🥤", category: "Saham US" },
  { symbol: "DIS", name: "Walt Disney Co.", short: "DIS", type: "stock_us", currency: "USD", unit: "per saham", icon: "🏰", category: "Saham US" },
  { symbol: "XOM", name: "Exxon Mobil", short: "XOM", type: "stock_us", currency: "USD", unit: "per saham", icon: "⛽", category: "Saham US" },
  { symbol: "WMT", name: "Walmart Inc.", short: "WMT", type: "stock_us", currency: "USD", unit: "per saham", icon: "🛒", category: "Saham US" },

  // --- Saham Indonesia ---
  { symbol: "BBCA.JK", name: "Bank Central Asia", short: "BBCA", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", short: "BBRI", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "TLKM.JK", name: "Telkom Indonesia", short: "TLKM", type: "stock_id", currency: "IDR", unit: "per saham", icon: "📡", category: "Saham Indonesia" },
  { symbol: "ASII.JK", name: "Astra International", short: "ASII", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🚙", category: "Saham Indonesia" },
  { symbol: "ANTM.JK", name: "Aneka Tambang (Antam)", short: "ANTM", type: "stock_id", currency: "IDR", unit: "per saham", icon: "⛏️", category: "Saham Indonesia" },
  { symbol: "GOTO.JK", name: "GoTo Gojek Tokopedia", short: "GOTO", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🛵", category: "Saham Indonesia" },
  { symbol: "BMRI.JK", name: "Bank Mandiri", short: "BMRI", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "BBNI.JK", name: "Bank Negara Indonesia", short: "BBNI", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🏦", category: "Saham Indonesia" },
  { symbol: "TPIA.JK", name: "Chandra Asri Pacific", short: "TPIA", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🧪", category: "Saham Indonesia" },
  { symbol: "UNVR.JK", name: "Unilever Indonesia", short: "UNVR", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🧴", category: "Saham Indonesia" },
  { symbol: "ICBP.JK", name: "Indofood CBP", short: "ICBP", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🍜", category: "Saham Indonesia" },
  { symbol: "KLBF.JK", name: "Kalbe Farma", short: "KLBF", type: "stock_id", currency: "IDR", unit: "per saham", icon: "💊", category: "Saham Indonesia" },
  { symbol: "UNTR.JK", name: "United Tractors", short: "UNTR", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🚜", category: "Saham Indonesia" },
  { symbol: "ADRO.JK", name: "Adaro Energy", short: "ADRO", type: "stock_id", currency: "IDR", unit: "per saham", icon: "⛏️", category: "Saham Indonesia" },
  { symbol: "MDKA.JK", name: "Merdeka Copper Gold", short: "MDKA", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🪙", category: "Saham Indonesia" },
  { symbol: "PGAS.JK", name: "Perusahaan Gas Negara", short: "PGAS", type: "stock_id", currency: "IDR", unit: "per saham", icon: "🔥", category: "Saham Indonesia" },

  // --- Kripto ---
  { symbol: "BTC-USD", name: "Bitcoin", short: "BTC", type: "crypto", currency: "USD", unit: "per koin", icon: "₿", category: "Kripto" },
  { symbol: "ETH-USD", name: "Ethereum", short: "ETH", type: "crypto", currency: "USD", unit: "per koin", icon: "Ξ", category: "Kripto" },

  // --- Indeks ---
  { symbol: "^JKSE", name: "IHSG (Jakarta Composite)", short: "IHSG", type: "index", currency: "IDR", unit: "poin", icon: "📊", category: "Indeks" },
  { symbol: "^GSPC", name: "S&P 500", short: "S&P 500", type: "index", currency: "USD", unit: "poin", icon: "📊", category: "Indeks" },
  { symbol: "^IXIC", name: "Nasdaq Composite", short: "Nasdaq", type: "index", currency: "USD", unit: "poin", icon: "📊", category: "Indeks" },

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

const TYPE_ICON: Record<AssetType, string> = {
  commodity: "📦",
  stock_us: "🇺🇸",
  stock_id: "🇮🇩",
  gold_antam: "🏅",
  fx: "💱",
  crypto: "🪙",
  index: "📊",
  etf: "🧺",
  other: "•",
};

const TYPE_CATEGORY: Record<AssetType, string> = {
  commodity: "Komoditas",
  stock_us: "Saham US",
  stock_id: "Saham Indonesia",
  gold_antam: "Logam Mulia",
  fx: "Mata Uang",
  crypto: "Kripto",
  index: "Indeks",
  etf: "ETF",
  other: "Lainnya",
};

export function iconForType(type: AssetType): string {
  return TYPE_ICON[type] ?? "•";
}

/**
 * Build an Asset record for a symbol that is not in the static catalog (e.g.
 * chosen via live search). Sensible defaults are derived from the type.
 */
export function makeAsset(input: {
  symbol: string;
  name?: string;
  short?: string;
  type?: AssetType;
  currency?: "USD" | "IDR";
  category?: string;
  icon?: string;
  unit?: string;
}): Asset {
  const type = input.type ?? "other";
  return {
    symbol: input.symbol,
    name: input.name || input.symbol,
    short: input.short || input.symbol,
    type,
    currency: input.currency ?? (input.symbol.endsWith(".JK") ? "IDR" : "USD"),
    unit: input.unit,
    icon: input.icon ?? iconForType(type),
    category: input.category ?? TYPE_CATEGORY[type],
  };
}

/** Resolve an asset from the static catalog, or synthesize a minimal one. */
export function resolveStaticAsset(symbol: string): Asset {
  return ASSET_MAP[symbol] ?? makeAsset({ symbol });
}
