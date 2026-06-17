import { NextRequest, NextResponse } from "next/server";
import { getRelativeValuation } from "@/lib/valuation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const rv = await getRelativeValuation(symbol);
  return NextResponse.json(rv);
}
