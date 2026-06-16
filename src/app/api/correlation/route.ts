import { NextRequest, NextResponse } from "next/server";
import { getDailyHistory } from "@/lib/yahoo";
import { getAntamDailyHistory } from "@/lib/antam";
import { correlationMatrix, dailyReturnsByDate } from "@/lib/correlation";

export const dynamic = "force-dynamic";

async function dailyFor(symbol: string) {
  const { candles, mock } =
    symbol === "ANTAM-GOLD"
      ? await getAntamDailyHistory()
      : await getDailyHistory(symbol);
  return { symbol, candles, mock };
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length < 2) {
    return NextResponse.json({ symbols, matrix: [], sampleSize: 0, mock: false });
  }

  const histories = await Promise.all(symbols.map(dailyFor));
  const mock = histories.some((h) => h.mock);
  const series = histories.map((h) => ({
    symbol: h.symbol,
    returns: dailyReturnsByDate(h.candles),
  }));
  const result = correlationMatrix(series);
  return NextResponse.json({ ...result, mock });
}
