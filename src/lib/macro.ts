import { getAsset } from "./assets";
import { getDailyHistory } from "./yahoo";
import type { Candle } from "./types";

/**
 * Lightweight macro context. For a given asset we pick the most relevant macro
 * indicators (rates, dollar, risk sentiment, related markets) and report their
 * current level plus recent trend so the AI can reason about the backdrop.
 */

type Kind = "price" | "yield";

interface MacroDef {
  symbol: string;
  label: string;
  kind: Kind;
}

const MACRO: Record<string, MacroDef> = {
  dxy: { symbol: "DX-Y.NYB", label: "Indeks Dolar AS (DXY)", kind: "price" },
  ust10y: { symbol: "^TNX", label: "Yield UST 10 Tahun", kind: "yield" },
  vix: { symbol: "^VIX", label: "VIX (indeks ketakutan)", kind: "price" },
  spx: { symbol: "^GSPC", label: "S&P 500", kind: "price" },
  ndx: { symbol: "^IXIC", label: "Nasdaq", kind: "price" },
  jkse: { symbol: "^JKSE", label: "IHSG", kind: "price" },
  usdidr: { symbol: "IDR=X", label: "USD/IDR", kind: "price" },
  wti: { symbol: "CL=F", label: "Minyak WTI", kind: "price" },
  gold: { symbol: "GC=F", label: "Emas", kind: "price" },
  btc: { symbol: "BTC-USD", label: "Bitcoin", kind: "price" },
};

export interface MacroIndicator {
  symbol: string;
  label: string;
  kind: Kind;
  value: number | null;
  /** % change for price indicators; point change (pp) for yields. */
  chg1m: number | null;
  chg3m: number | null;
  ytd: number | null;
}

export interface MacroContext {
  available: boolean;
  symbol: string;
  mock?: boolean;
  indicators: MacroIndicator[];
}

/** Pick the relevant macro indicator keys for an asset. */
function keysFor(symbol: string): string[] {
  const a = getAsset(symbol);
  const t = a?.type;
  const cat = a?.category ?? "";
  let keys: string[];
  switch (t) {
    case "stock_id":
      keys = ["usdidr", "jkse", "ust10y", "dxy"];
      break;
    case "stock_us":
      keys = ["spx", "ust10y", "dxy", "vix"];
      break;
    case "gold_antam":
      keys = ["gold", "usdidr", "dxy", "ust10y"];
      break;
    case "commodity":
      keys =
        cat === "Energi"
          ? ["dxy", "ust10y", "wti"]
          : cat === "Logam Mulia"
            ? ["dxy", "ust10y", "gold"]
            : ["dxy", "ust10y", "wti"]; // industri / agrikultur
      break;
    case "crypto":
      keys = ["btc", "ndx", "vix", "dxy"];
      break;
    case "index":
      keys = ["ust10y", "dxy", "vix"];
      break;
    case "fx":
      keys = ["dxy", "ust10y", "jkse"];
      break;
    default:
      keys = ["dxy", "ust10y", "spx"];
  }
  // Never compare an asset against itself.
  return keys.filter((k) => MACRO[k] && MACRO[k].symbol !== symbol);
}

function changeOverDays(candles: Candle[], days: number, kind: Kind): number | null {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1].close;
  const idx = Math.max(0, candles.length - 1 - days);
  const past = candles[idx].close;
  if (past == null || last == null || past === 0) return null;
  return kind === "yield" ? last - past : (last / past - 1) * 100;
}

function ytdChange(candles: Candle[], kind: Kind): number | null {
  if (candles.length < 2) return null;
  const year = new Date().getUTCFullYear();
  const first = candles.find((c) => new Date(c.time * 1000).getUTCFullYear() === year);
  const last = candles[candles.length - 1].close;
  if (!first || first.close === 0 || last == null) return null;
  return kind === "yield" ? last - first.close : (last / first.close - 1) * 100;
}

/** Macro backdrop for an asset. Degrades to mock candles in sandbox. */
export async function getMacroContext(symbol: string): Promise<MacroContext> {
  const keys = keysFor(symbol);
  if (keys.length === 0) return { available: false, symbol, indicators: [] };

  const results = await Promise.all(
    keys.map(async (k) => {
      const def = MACRO[k];
      const { candles, mock } = await getDailyHistory(def.symbol, "1y");
      const value = candles.length ? candles[candles.length - 1].close : null;
      return {
        mock,
        ind: {
          symbol: def.symbol,
          label: def.label,
          kind: def.kind,
          value,
          chg1m: changeOverDays(candles, 21, def.kind),
          chg3m: changeOverDays(candles, 63, def.kind),
          ytd: ytdChange(candles, def.kind),
        } as MacroIndicator,
      };
    }),
  );

  const indicators = results.map((r) => r.ind).filter((i) => i.value != null);
  if (indicators.length === 0) return { available: false, symbol, indicators: [] };
  return {
    available: true,
    symbol,
    mock: results.some((r) => r.mock),
    indicators,
  };
}

function fmtValue(i: MacroIndicator): string {
  if (i.value == null) return "n/a";
  if (i.kind === "yield") return `${i.value.toFixed(2)}%`;
  const a = Math.abs(i.value);
  const dp = a >= 1000 ? 0 : a >= 100 ? 1 : 2;
  return i.value.toLocaleString("id-ID", { maximumFractionDigits: dp });
}

export function fmtChange(i: MacroIndicator, v: number | null): string {
  if (v == null) return "n/a";
  const sign = v >= 0 ? "+" : "";
  return i.kind === "yield" ? `${sign}${v.toFixed(2)} pp` : `${sign}${v.toFixed(1)}%`;
}

export { fmtValue };

/** Compact summary for AI evidence. */
export function summarizeMacroForAI(m: MacroContext): string {
  if (!m.available) return "Tidak tersedia.";
  const parts = m.indicators.map(
    (i) => `${i.label} ${fmtValue(i)} (1bln ${fmtChange(i, i.chg1m)}, YTD ${fmtChange(i, i.ytd)})`,
  );
  return (
    parts.join("; ") +
    ". Pertimbangkan hubungan umum: dolar (DXY) & yield naik biasanya menekan emas, komoditas, dan saham pasar berkembang; VIX tinggi = risk-off." +
    (m.mock ? " (CATATAN: sebagian angka contoh/mock.)" : "")
  );
}
