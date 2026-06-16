import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const result = await searchAssets(q);
  return NextResponse.json(result);
}
