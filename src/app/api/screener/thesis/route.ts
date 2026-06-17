import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { screenSymbols, snapshotLine, type Style } from "@/lib/screener";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Provider {
  label: string;
  model: string;
  kind: "anthropic" | "deepseek";
  envKey: string;
}
const PROVIDERS: Record<string, Provider> = {
  claude: { label: "Claude", model: "claude-opus-4-8", kind: "anthropic", envKey: "ANTHROPIC_API_KEY" },
  "deepseek-chat": { label: "DeepSeek V3", model: "deepseek-chat", kind: "deepseek", envKey: "DEEPSEEK_API_KEY" },
  "deepseek-reasoner": { label: "DeepSeek R1", model: "deepseek-reasoner", kind: "deepseek", envKey: "DEEPSEEK_API_KEY" },
};

const SYSTEM = `Anda analis ekuitas yang ringkas, objektif, dan jujur soal ketidakpastian, menulis untuk investor ritel Indonesia.
Anda menerima daftar saham yang lolos penyaring "undervalued + berkualitas + potensi naik" beserta metrik kuantitatifnya.
Untuk SETIAP saham, tulis: (1) tesis singkat mengapa berpotensi undervalued/naik, (2) satu risiko utama (termasuk kemungkinan "value trap").
Aturan: HANYA berdasarkan metrik yang diberikan; jangan mengarang angka. Jangan menjanjikan untung.
Balas HANYA JSON valid tanpa teks lain, format persis:
{"theses":[{"symbol":"...","thesis":"...","risk":"..."}]}
"thesis" maksimal ~28 kata, "risk" maksimal ~16 kata, Bahasa Indonesia.`;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  const style = (req.nextUrl.searchParams.get("style") ?? "balanced") as Style;
  const providerKey = req.nextUrl.searchParams.get("provider") ?? "claude";
  const provider = PROVIDERS[providerKey] ?? PROVIDERS.claude;

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const scored = await screenSymbols(symbols, style);
  if (scored.length === 0) {
    return NextResponse.json({ enabled: false, theses: {}, note: "Data tidak tersedia." });
  }

  if (!process.env[provider.envKey]) {
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      theses: {},
      note: `Tesis AI nonaktif untuk ${provider.label} (${provider.envKey} belum diset).`,
    });
  }

  const evidence = `Saham lolos penyaring (gaya: ${style}). Tulis tesis & risiko per saham:\n${scored
    .map((s) => snapshotLine(s))
    .join("\n")}`;

  try {
    const text =
      provider.kind === "anthropic"
        ? await callAnthropic(provider.model, evidence)
        : await callDeepseek(provider.model, evidence);
    const theses = parseTheses(text);
    return NextResponse.json({
      enabled: true,
      provider: providerKey,
      providerLabel: provider.label,
      model: provider.model,
      mock: scored.some((s) => s.mock),
      theses,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      theses: {},
      note: `Tesis ${provider.label} gagal (${message}).`,
    });
  }
}

function parseTheses(text: string): Record<string, { thesis: string; risk: string }> {
  const out: Record<string, { thesis: string; risk: string }> = {};
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return out;
    const obj = JSON.parse(text.slice(start, end + 1));
    const arr = Array.isArray(obj.theses) ? obj.theses : [];
    for (const t of arr) {
      if (typeof t?.symbol === "string") {
        out[t.symbol] = {
          thesis: typeof t.thesis === "string" ? t.thesis : "",
          risk: typeof t.risk === "string" ? t.risk : "",
        };
      }
    }
  } catch {
    // ignore
  }
  return out;
}

async function callAnthropic(model: string, evidence: string): Promise<string> {
  const client = new Anthropic();
  const params = {
    model,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [{ role: "user", content: evidence }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;
  const msg = await client.messages.create(params);
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function callDeepseek(model: string, evidence: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: evidence },
      ],
      max_tokens: 2000,
      temperature: 0.4,
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 150)}` : ""}`);
  }
  const json = await res.json();
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("respons kosong");
  return text;
}
