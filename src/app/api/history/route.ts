import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/yahoo";
import { getAntamHistory } from "@/lib/antam";
import type { HistoryResponse, RangeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const rangeParam = (req.nextUrl.searchParams.get("range") ?? "3M") as RangeKey;
  const range = VALID_RANGES.includes(rangeParam) ? rangeParam : "3M";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const { candles, mock } =
    symbol === "ANTAM-GOLD"
      ? await getAntamHistory(range)
      : await getHistory(symbol, range);

  const body: HistoryResponse = { symbol, range, candles, mock };
  return NextResponse.json(body);
}
