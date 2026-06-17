import { NextRequest, NextResponse } from "next/server";
import { getFinancials } from "@/lib/financials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const fin = await getFinancials(symbol);
  return NextResponse.json(fin);
}
