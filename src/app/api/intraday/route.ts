import { NextRequest, NextResponse } from "next/server";
import { getDailyLevels } from "@/lib/intraday";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const levels = await getDailyLevels(symbol);
  return NextResponse.json(levels);
}
