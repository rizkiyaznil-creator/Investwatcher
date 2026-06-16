import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Reports whether AI provider API keys are configured on the server.
 * Returns booleans only — never the key values.
 */
export async function GET() {
  return NextResponse.json({
    claude: !!process.env.ANTHROPIC_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
  });
}
