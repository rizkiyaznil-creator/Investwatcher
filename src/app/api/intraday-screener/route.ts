import { NextResponse } from "next/server";
import { runIntradayScreener } from "@/lib/intraday-screener";

export const dynamic = "force-dynamic";

export async function GET() {
  const screen = await runIntradayScreener(30);
  return NextResponse.json(screen);
}
