import { NextRequest, NextResponse } from "next/server";
import { runScreener, type Style } from "@/lib/screener";
import type { Market } from "@/lib/screener-universe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MARKETS: Market[] = ["all", "us", "id"];
const STYLES: Style[] = ["balanced", "deepvalue", "garp"];

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get("market") ?? "all") as Market;
  const style = (req.nextUrl.searchParams.get("style") ?? "balanced") as Style;
  const limit = Math.max(5, Math.min(40, Number(req.nextUrl.searchParams.get("limit") ?? 25)));

  const result = await runScreener(
    MARKETS.includes(market) ? market : "all",
    STYLES.includes(style) ? style : "balanced",
    limit,
  );
  return NextResponse.json(result);
}
