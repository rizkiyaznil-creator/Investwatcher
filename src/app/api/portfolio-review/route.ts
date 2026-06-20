import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

const SYSTEM = `Anda penasihat portofolio yang objektif, ringkas, dan jujur soal ketidakpastian, menulis untuk investor ritel Indonesia.
Anda menerima ringkasan portofolio (komposisi, bobot %, untung/rugi %, pasar/kategori tiap posisi, dan metrik agregat).
Analisis fokus pada: (1) diversifikasi (sebaran sektor/pasar/aset), (2) konsentrasi & risiko (posisi terlalu besar, korelasi, eksposur satu pasar/mata uang), (3) catatan untung/rugi, (4) saran perbaikan yang umum & edukatif.
Aturan: HANYA berdasarkan data yang diberikan; jangan mengarang angka atau nama. Jangan menjanjikan untung. Ini edukasi, BUKAN saran investasi personal.
Balas HANYA JSON valid tanpa teks lain, format persis:
{"ringkasan":"...","diversifikasi":"...","konsentrasi":"...","risiko":["...","..."],"saran":["...","..."]}
"ringkasan" ~40 kata; "diversifikasi" & "konsentrasi" masing-masing ~35 kata; "risiko" & "saran" masing-masing 2-4 butir singkat. Bahasa Indonesia.`;

interface ReviewInput {
  totalValue?: number;
  currency?: string;
  totalPlPct?: number;
  holdings: {
    symbol: string;
    name?: string;
    market?: string;
    category?: string;
    weightPct?: number;
    plPct?: number;
  }[];
}

export async function POST(req: NextRequest) {
  let body: ReviewInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ enabled: false, note: "Body tidak valid." }, { status: 400 });
  }

  const providerKey = new URL(req.url).searchParams.get("provider") ?? "claude";
  const provider = PROVIDERS[providerKey] ?? PROVIDERS.claude;

  const holdings = (body.holdings ?? []).slice(0, 50);
  if (holdings.length === 0) {
    return NextResponse.json({ enabled: false, note: "Portofolio kosong." });
  }
  if (!process.env[provider.envKey]) {
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      note: `Review AI nonaktif untuk ${provider.label} (${provider.envKey} belum diset).`,
    });
  }

  const lines = holdings
    .map(
      (h) =>
        `- ${h.name ?? h.symbol} (${h.symbol}; ${h.market ?? "?"}${h.category ? `, ${h.category}` : ""}): bobot ${
          h.weightPct != null ? h.weightPct.toFixed(1) : "?"
        }%, P/L ${h.plPct != null ? (h.plPct >= 0 ? "+" : "") + h.plPct.toFixed(1) + "%" : "?"}`,
    )
    .join("\n");
  const evidence = `Ringkasan portofolio:
- Jumlah posisi: ${holdings.length}
- Nilai total: ${body.totalValue != null ? `${Math.round(body.totalValue).toLocaleString("id-ID")} ${body.currency ?? ""}` : "?"}
- Total untung/rugi: ${body.totalPlPct != null ? (body.totalPlPct >= 0 ? "+" : "") + body.totalPlPct.toFixed(1) + "%" : "?"}

Posisi (urut bobot):
${lines}

Tulis analisis sesuai format JSON.`;

  try {
    const text =
      provider.kind === "anthropic"
        ? await callAnthropic(provider.model, evidence)
        : await callDeepseek(provider.model, evidence);
    const review = parseReview(text);
    if (!review) throw new Error("format respons tidak dikenali");
    return NextResponse.json({
      enabled: true,
      provider: providerKey,
      providerLabel: provider.label,
      model: provider.model,
      review,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      note: `Review ${provider.label} gagal (${message}).`,
    });
  }
}

interface Review {
  ringkasan: string;
  diversifikasi: string;
  konsentrasi: string;
  risiko: string[];
  saran: string[];
}

function parseReview(text: string): Review | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(text.slice(start, end + 1));
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    return {
      ringkasan: typeof o.ringkasan === "string" ? o.ringkasan : "",
      diversifikasi: typeof o.diversifikasi === "string" ? o.diversifikasi : "",
      konsentrasi: typeof o.konsentrasi === "string" ? o.konsentrasi : "",
      risiko: arr(o.risiko),
      saran: arr(o.saran),
    };
  } catch {
    return null;
  }
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
    const b = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${b ? `: ${b.slice(0, 150)}` : ""}`);
  }
  const json = await res.json();
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("respons kosong");
  return text;
}
