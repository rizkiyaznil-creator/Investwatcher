import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";
import { getAntamQuote } from "@/lib/antam";
import type { Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

async function quoteFor(symbol: string): Promise<Quote> {
  if (symbol === "ANTAM-GOLD") return getAntamQuote();
  return getQuote(symbol);
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes = await Promise.all(symbols.map(quoteFor));
  return NextResponse.json({ quotes });
}
