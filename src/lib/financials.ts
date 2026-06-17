import { getAsset } from "./assets";

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface FinPeriod {
  endDate: number; // seconds epoch
  label: string; // "2024" or "Q2 2024"
}
export interface FinRow {
  key: string;
  label: string;
  /** Values aligned with statement.periods (newest first). null when missing. */
  values: (number | null)[];
}
export interface FinStatement {
  periods: FinPeriod[];
  rows: FinRow[];
}
export interface Financials {
  available: boolean;
  symbol: string;
  currency?: string;
  mock?: boolean;
  reason?: string;
  annual: { income: FinStatement; balance: FinStatement; cashflow: FinStatement };
  quarterly: { income: FinStatement; balance: FinStatement; cashflow: FinStatement };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function raw(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return null;
}

interface LineSpec {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get?: (item: any) => number | null;
}

const INCOME_LINES: LineSpec[] = [
  { key: "totalRevenue", label: "Pendapatan" },
  { key: "grossProfit", label: "Laba Kotor" },
  { key: "operatingIncome", label: "Laba Operasi" },
  { key: "netIncome", label: "Laba Bersih" },
];
const BALANCE_LINES: LineSpec[] = [
  { key: "totalAssets", label: "Total Aset" },
  { key: "totalLiab", label: "Total Liabilitas" },
  { key: "totalStockholderEquity", label: "Ekuitas" },
  { key: "cash", label: "Kas & Setara" },
  {
    key: "totalDebt",
    label: "Total Utang",
    get: (i) => {
      const lt = raw(i.longTermDebt);
      const st = raw(i.shortLongTermDebt);
      if (lt == null && st == null) return null;
      return (lt ?? 0) + (st ?? 0);
    },
  },
];
const CASHFLOW_LINES: LineSpec[] = [
  { key: "totalCashFromOperatingActivities", label: "Arus Kas Operasi" },
  { key: "capitalExpenditures", label: "Belanja Modal" },
  {
    key: "freeCashFlow",
    label: "Arus Kas Bebas",
    get: (i) => {
      const op = raw(i.totalCashFromOperatingActivities);
      const capex = raw(i.capitalExpenditures);
      if (op == null && capex == null) return null;
      return (op ?? 0) + (capex ?? 0); // capex already negative
    },
  },
];

function periodLabel(endDateSec: number, quarterly: boolean): string {
  const d = new Date(endDateSec * 1000);
  const y = d.getUTCFullYear();
  if (!quarterly) return String(y);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${y}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStatement(items: any[], lines: LineSpec[], quarterly: boolean, max: number): FinStatement {
  const valid = (items ?? []).filter((it) => raw(it.endDate) != null);
  valid.sort((a, b) => (raw(b.endDate) ?? 0) - (raw(a.endDate) ?? 0)); // newest first
  const chosen = valid.slice(0, max);
  const periods: FinPeriod[] = chosen.map((it) => {
    const end = raw(it.endDate)!;
    return { endDate: end, label: periodLabel(end, quarterly) };
  });
  const rows: FinRow[] = lines.map((spec) => ({
    key: spec.key,
    label: spec.label,
    values: chosen.map((it) => (spec.get ? spec.get(it) : raw(it[spec.key]))),
  }));
  return { periods, rows };
}

function emptyStatement(): FinStatement {
  return { periods: [], rows: [] };
}

/** True for asset types that publish financial statements. */
export function hasFinancials(symbol: string): boolean {
  const t = getAsset(symbol)?.type;
  if (!t) return true; // unknown/custom symbol: attempt
  return t === "stock_us" || t === "stock_id" || t === "other";
}

const MODULES = [
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistory",
  "balanceSheetHistoryQuarterly",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
  "financialData",
].join(",");

/** Best-effort financial statements from Yahoo. Falls back to mock on failure. */
export async function getFinancials(symbol: string): Promise<Financials> {
  if (!hasFinancials(symbol)) {
    return {
      available: false,
      symbol,
      reason: "Aset ini tidak menerbitkan laporan keuangan (mis. komoditas, kripto, indeks, FX).",
      annual: { income: emptyStatement(), balance: emptyStatement(), cashflow: emptyStatement() },
      quarterly: { income: emptyStatement(), balance: emptyStatement(), cashflow: emptyStatement() },
    };
  }

  for (const host of HOSTS) {
    try {
      const url = `${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        next: { revalidate: 21600 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json?.quoteSummary?.result?.[0];
      if (!r) continue;

      const currency: string | undefined = r.financialData?.financialCurrency ?? undefined;
      const annual = {
        income: buildStatement(r.incomeStatementHistory?.incomeStatementHistory, INCOME_LINES, false, 5),
        balance: buildStatement(r.balanceSheetHistory?.balanceSheetStatements, BALANCE_LINES, false, 5),
        cashflow: buildStatement(r.cashflowStatementHistory?.cashflowStatements, CASHFLOW_LINES, false, 5),
      };
      const quarterly = {
        income: buildStatement(r.incomeStatementHistoryQuarterly?.incomeStatementHistory, INCOME_LINES, true, 6),
        balance: buildStatement(r.balanceSheetHistoryQuarterly?.balanceSheetStatements, BALANCE_LINES, true, 6),
        cashflow: buildStatement(r.cashflowStatementHistoryQuarterly?.cashflowStatements, CASHFLOW_LINES, true, 6),
      };

      const anyData =
        annual.income.periods.length > 0 ||
        annual.balance.periods.length > 0 ||
        annual.cashflow.periods.length > 0;
      if (!anyData) continue;

      return { available: true, symbol, currency, annual, quarterly };
    } catch {
      // try next host
    }
  }

  // Live unavailable (e.g. sandbox egress) → deterministic mock so the UI works.
  return mockFinancials(symbol);
}

/** Deterministic mock financials seeded by symbol — for offline/sandbox use. */
export function mockFinancials(symbol: string): Financials {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const idr = symbol.endsWith(".JK");
  const currency = idr ? "IDR" : "USD";
  const scale = idr ? 1e12 : 1e9; // trillions IDR vs billions USD
  const baseRevenue = (5 + rng() * 40) * scale;
  const margin = 0.08 + rng() * 0.18;
  const growth = 0.04 + rng() * 0.12;

  const nowYear = new Date().getUTCFullYear();

  const annualIncome = (yearsBack: number) => {
    const factor = Math.pow(1 + growth, -yearsBack);
    const rev = baseRevenue * factor;
    return {
      totalRevenue: rev,
      grossProfit: rev * (0.3 + margin),
      operatingIncome: rev * (margin + 0.04),
      netIncome: rev * margin,
    };
  };

  const mkStatement = (
    count: number,
    quarterly: boolean,
    make: (back: number) => Record<string, number>,
    lines: LineSpec[],
  ): FinStatement => {
    const periods: FinPeriod[] = [];
    const data: Record<string, number>[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(Date.UTC(nowYear, 11, 31));
      if (quarterly) d.setUTCMonth(d.getUTCMonth() - i * 3);
      else d.setUTCFullYear(d.getUTCFullYear() - i);
      const sec = Math.floor(d.getTime() / 1000);
      periods.push({ endDate: sec, label: periodLabel(sec, quarterly) });
      data.push(make(quarterly ? i / 4 : i));
    }
    const rows: FinRow[] = lines.map((spec) => ({
      key: spec.key,
      label: spec.label,
      values: data.map((d) => (spec.get ? spec.get(d) : (d[spec.key] ?? null))),
    }));
    return { periods, rows };
  };

  const incomeMake = (back: number) => annualIncome(back);
  const balanceMake = (back: number): Record<string, number> => {
    const inc = annualIncome(back);
    const assets = inc.totalRevenue * (1.4 + rng() * 0.4);
    const liab = assets * (0.45 + rng() * 0.2);
    return {
      totalAssets: assets,
      totalLiab: liab,
      totalStockholderEquity: assets - liab,
      cash: assets * (0.08 + rng() * 0.07),
      longTermDebt: liab * 0.4,
      shortLongTermDebt: liab * 0.15,
    };
  };
  const cashflowMake = (back: number): Record<string, number> => {
    const inc = annualIncome(back);
    const op = inc.netIncome * (1.1 + rng() * 0.3);
    const capex = -inc.totalRevenue * (0.05 + rng() * 0.05);
    return { totalCashFromOperatingActivities: op, capitalExpenditures: capex };
  };

  return {
    available: true,
    symbol,
    currency,
    mock: true,
    annual: {
      income: mkStatement(5, false, incomeMake, INCOME_LINES),
      balance: mkStatement(5, false, balanceMake, BALANCE_LINES),
      cashflow: mkStatement(5, false, cashflowMake, CASHFLOW_LINES),
    },
    quarterly: {
      income: mkStatement(6, true, incomeMake, INCOME_LINES),
      balance: mkStatement(6, true, balanceMake, BALANCE_LINES),
      cashflow: mkStatement(6, true, cashflowMake, CASHFLOW_LINES),
    },
  };
}

/** YoY % change of the two newest values in a row (newest vs previous). */
export function yoy(row: FinRow): number | null {
  const [cur, prev] = row.values;
  if (cur == null || prev == null || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** Compact one-paragraph summary of latest annual figures for AI evidence. */
export function summarizeFinancialsForAI(fin: Financials): string {
  if (!fin.available) return "Tidak tersedia.";
  const cur = fin.currency ?? "";
  const fmt = (n: number | null) => {
    if (n == null) return "n/a";
    const a = Math.abs(n);
    if (a >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${(n / 1e6).toFixed(1)}Jt`;
    return n.toFixed(0);
  };
  const line = (st: FinStatement, key: string) => {
    const row = st.rows.find((r) => r.key === key);
    if (!row) return null;
    const v = row.values[0];
    const g = yoy(row);
    return `${row.label} ${fmt(v)}${g != null ? ` (YoY ${g >= 0 ? "+" : ""}${g.toFixed(1)}%)` : ""}`;
  };
  const inc = fin.annual.income;
  const bal = fin.annual.balance;
  const cf = fin.annual.cashflow;
  const period = inc.periods[0]?.label ?? bal.periods[0]?.label ?? "terbaru";
  const parts = [
    `Mata uang: ${cur}. Periode terbaru (tahunan): ${period}.`,
    [line(inc, "totalRevenue"), line(inc, "netIncome"), line(inc, "operatingIncome")].filter(Boolean).join("; "),
    [line(bal, "totalAssets"), line(bal, "totalStockholderEquity"), line(bal, "totalDebt")].filter(Boolean).join("; "),
    [line(cf, "totalCashFromOperatingActivities"), line(cf, "freeCashFlow")].filter(Boolean).join("; "),
  ].filter(Boolean);
  return parts.join("\n") + (fin.mock ? "\n(CATATAN: angka contoh/mock.)" : "");
}
