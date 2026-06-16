import type { AssetType } from "./types";
import { ASSETS, ASSET_MAP } from "./assets";

export interface SearchResult {
  symbol: string;
  name: string;
  type: AssetType;
  currency: "USD" | "IDR";
  exchange?: string;
  /** True when the symbol already exists in the static featured catalog. */
  inCatalog: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  mock: boolean;
}

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function mapType(quoteType: string, symbol: string): AssetType {
  switch ((quoteType || "").toUpperCase()) {
    case "FUTURE":
      return "commodity";
    case "CRYPTOCURRENCY":
      return "crypto";
    case "INDEX":
      return "index";
    case "ETF":
      return "etf";
    case "CURRENCY":
      return "fx";
    case "EQUITY":
      return symbol.endsWith(".JK") ? "stock_id" : "stock_us";
    default:
      return "other";
  }
}

function guessCurrency(symbol: string): "USD" | "IDR" {
  return symbol.endsWith(".JK") || symbol.startsWith("^JK") ? "IDR" : "USD";
}

async function yahooSearch(q: string): Promise<SearchResult[] | null> {
  const qs = `q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/v1/finance/search?${qs}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const quotes: any[] = json?.quotes ?? [];
      const results: SearchResult[] = [];
      for (const it of quotes) {
        const symbol: string = it.symbol;
        if (!symbol) continue;
        const type = mapType(it.quoteType, symbol);
        if (type === "fx" && symbol !== "IDR=X") continue; // FX noise
        results.push({
          symbol,
          name: it.longname || it.shortname || symbol,
          type,
          currency: guessCurrency(symbol),
          exchange: it.exchDisp || it.exchange,
          inCatalog: !!ASSET_MAP[symbol],
        });
      }
      return results;
    } catch {
      // try next host
    }
  }
  return null;
}

/** Local fallback: filter the static catalog by query. */
function localSearch(q: string): SearchResult[] {
  const needle = q.toLowerCase();
  return ASSETS.filter(
    (a) =>
      a.symbol.toLowerCase().includes(needle) ||
      a.name.toLowerCase().includes(needle) ||
      a.short.toLowerCase().includes(needle),
  ).map((a) => ({
    symbol: a.symbol,
    name: a.name,
    type: a.type,
    currency: a.currency,
    exchange: a.category,
    inCatalog: true,
  }));
}

export async function searchAssets(q: string): Promise<SearchResponse> {
  const query = q.trim();
  if (!query) return { query, results: [], mock: false };

  const remote = await yahooSearch(query);
  if (remote && remote.length) return { query, results: remote, mock: false };
  if (remote && remote.length === 0) return { query, results: [], mock: false };

  return { query, results: localSearch(query), mock: true };
}
