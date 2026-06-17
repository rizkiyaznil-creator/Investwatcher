import { NextRequest, NextResponse } from "next/server";
import { getFundamentals } from "@/lib/fundamentals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const f = await getFundamentals(symbol);
  return NextResponse.json(f);
}
