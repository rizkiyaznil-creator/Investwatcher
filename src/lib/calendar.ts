import { getAsset } from "./assets";
import { hasFinancials } from "./financials";
import { yahooQuoteSummary } from "./yahoo-fetch";

export interface EarningsInfo {
  nextDate?: number; // seconds epoch
  isFuture?: boolean;
  daysUntil?: number;
  epsEstimate?: number;
  epsLow?: number;
  epsHigh?: number;
  revenueEstimate?: number;
}
export interface DividendInfo {
  rate?: number; // annual per share
  yieldPct?: number; // percent, e.g. 2.8
  exDate?: number;
  payDate?: number;
  payoutRatio?: number; // fraction
  lastValue?: number;
  lastDate?: number;
}
export interface CalendarInfo {
  available: boolean;
  symbol: string;
  currency?: string;
  mock?: boolean;
  paysDividend: boolean;
  earnings?: EarningsInfo;
  dividend?: DividendInfo;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function raw(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

function daysFromNow(sec?: number): number | undefined {
  if (sec == null) return undefined;
  return Math.round((sec * 1000 - Date.now()) / 86400000);
}

/** Assets that report earnings / may pay dividends (same set as financials). */
export function hasCalendar(symbol: string): boolean {
  return hasFinancials(symbol);
}

/** Earnings & dividend calendar from Yahoo. Mock fallback in sandbox. */
export async function getCalendar(symbol: string): Promise<CalendarInfo> {
  if (!hasCalendar(symbol)) {
    return { available: false, symbol, paysDividend: false };
  }

  const modules = "calendarEvents,summaryDetail,defaultKeyStatistics,financialData";
  {
    try {
      const r = await yahooQuoteSummary(symbol, modules, 21600);
      if (r) {

      const ce = r.calendarEvents ?? {};
      const sd = r.summaryDetail ?? {};
      const ks = r.defaultKeyStatistics ?? {};
      const fd = r.financialData ?? {};
      const earn = ce.earnings ?? {};

      // earningsDate may be an array of timestamps (sometimes a range).
      const dates: number[] = Array.isArray(earn.earningsDate)
        ? earn.earningsDate.map((d: unknown) => raw(d)).filter((n: number | undefined): n is number => n != null)
        : [];
      const nextDate = dates.length ? Math.min(...dates) : undefined;

      const earnings: EarningsInfo | undefined =
        nextDate != null
          ? {
              nextDate,
              isFuture: nextDate * 1000 > Date.now(),
              daysUntil: daysFromNow(nextDate),
              epsEstimate: raw(earn.earningsAverage),
              epsLow: raw(earn.earningsLow),
              epsHigh: raw(earn.earningsHigh),
              revenueEstimate: raw(earn.revenueAverage),
            }
          : undefined;

      const yieldRaw = raw(sd.dividendYield) ?? raw(sd.trailingAnnualDividendYield);
      const rate = raw(sd.dividendRate) ?? raw(sd.trailingAnnualDividendRate);
      const exDate = raw(ce.exDividendDate) ?? raw(sd.exDividendDate);
      const payDate = raw(ce.dividendDate) ?? raw(sd.dividendDate);
      const payoutRatio = raw(sd.payoutRatio);
      const lastValue = raw(ks.lastDividendValue);
      const lastDate = raw(ks.lastDividendDate);

      const paysDividend = (rate ?? 0) > 0 || (yieldRaw ?? 0) > 0 || exDate != null;
      const dividend: DividendInfo | undefined = paysDividend
        ? {
            rate,
            yieldPct: yieldRaw != null ? yieldRaw * 100 : undefined,
            exDate,
            payDate,
            payoutRatio,
            lastValue,
            lastDate,
          }
        : undefined;

      const available = !!earnings || !!dividend;
      if (available) {
        return {
          available,
          symbol,
          currency: (fd.financialCurrency as string | undefined) ?? getAsset(symbol)?.currency,
          paysDividend,
          earnings,
          dividend,
        };
      }
      }
    } catch {
      // fall through to mock
    }
  }

  return mockCalendar(symbol);
}

/** Deterministic mock calendar seeded by symbol — for offline/sandbox use. */
export function mockCalendar(symbol: string): CalendarInfo {
  if (!hasCalendar(symbol)) return { available: false, symbol, paysDividend: false };
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const day = 86400;
  const now = Math.floor(Date.now() / 1000);
  const nextDate = now + Math.floor((10 + rng() * 70) * day);
  const eps = 0.5 + rng() * 4;
  const paysDividend = rng() > 0.3;
  return {
    available: true,
    symbol,
    currency: getAsset(symbol)?.currency,
    mock: true,
    paysDividend,
    earnings: {
      nextDate,
      isFuture: true,
      daysUntil: daysFromNow(nextDate),
      epsEstimate: eps,
      epsLow: eps * 0.85,
      epsHigh: eps * 1.15,
    },
    dividend: paysDividend
      ? {
          yieldPct: 1 + rng() * 5,
          payoutRatio: 0.2 + rng() * 0.5,
          exDate: now + Math.floor((20 + rng() * 60) * day),
          payDate: now + Math.floor((35 + rng() * 60) * day),
        }
      : undefined,
  };
}

function fmtDate(sec?: number): string {
  if (sec == null) return "n/a";
  return new Date(sec * 1000).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Compact summary for AI evidence. */
export function summarizeCalendarForAI(c: CalendarInfo): string {
  if (!c.available) return "Tidak tersedia.";
  const parts: string[] = [];
  if (c.earnings?.nextDate != null) {
    const d = c.earnings.daysUntil;
    const when = c.earnings.isFuture && d != null ? ` (dalam ~${d} hari)` : d != null && d < 0 ? " (sudah lewat)" : "";
    const eps =
      c.earnings.epsEstimate != null
        ? `, estimasi EPS ${c.earnings.epsEstimate.toFixed(2)}${
            c.earnings.epsLow != null && c.earnings.epsHigh != null
              ? ` (rentang ${c.earnings.epsLow.toFixed(2)}–${c.earnings.epsHigh.toFixed(2)})`
              : ""
          }`
        : "";
    parts.push(`Laporan keuangan berikutnya: ${fmtDate(c.earnings.nextDate)}${when}${eps}.`);
  }
  if (c.dividend) {
    const bits = [
      c.dividend.yieldPct != null ? `yield ${c.dividend.yieldPct.toFixed(2)}%` : null,
      c.dividend.rate != null ? `rate ${c.dividend.rate}/saham` : null,
      c.dividend.exDate != null ? `ex-date ${fmtDate(c.dividend.exDate)}` : null,
      c.dividend.payoutRatio != null ? `payout ${(c.dividend.payoutRatio * 100).toFixed(0)}%` : null,
    ].filter(Boolean);
    if (bits.length) parts.push(`Dividen: ${bits.join(", ")}.`);
  } else {
    parts.push("Tidak membagikan dividen / data dividen tidak tersedia.");
  }
  if (c.earnings?.isFuture) {
    parts.push("Catatan: rilis laporan adalah potensi katalis volatilitas; perhitungkan bila berada dalam horizon.");
  }
  return parts.join(" ") + (c.mock ? " (CATATAN: angka contoh/mock.)" : "");
}
