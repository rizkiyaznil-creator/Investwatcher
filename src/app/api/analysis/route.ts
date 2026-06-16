import { NextRequest, NextResponse } from "next/server";
import { getDailyHistory } from "@/lib/yahoo";
import { getAntamDailyHistory } from "@/lib/antam";
import { computeMetrics, type AssetMetrics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

interface Row {
  symbol: string;
  metrics: AssetMetrics;
  mock: boolean;
}

async function analyze(symbol: string): Promise<Row> {
  const { candles, mock } =
    symbol === "ANTAM-GOLD"
      ? await getAntamDailyHistory()
      : await getDailyHistory(symbol);
  return { symbol, metrics: computeMetrics(candles), mock };
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (symbols.length === 0) return NextResponse.json({ rows: [] });

  const rows = await Promise.all(symbols.map(analyze));
  return NextResponse.json({ rows });
}
