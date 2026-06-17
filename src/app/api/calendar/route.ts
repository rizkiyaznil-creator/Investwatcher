import { NextRequest, NextResponse } from "next/server";
import { getCalendar } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const cal = await getCalendar(symbol);
  return NextResponse.json(cal);
}
