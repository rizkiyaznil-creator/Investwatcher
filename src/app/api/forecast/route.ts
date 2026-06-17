import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getQuote, getDailyHistory } from "@/lib/yahoo";
import { getAntamQuote, getAntamDailyHistory } from "@/lib/antam";
import { getFundamentals, type Fundamentals } from "@/lib/fundamentals";
import { getFinancials, hasFinancials, summarizeFinancialsForAI } from "@/lib/financials";
import { getRelativeValuation, hasPeerGroup, summarizeValuationForAI } from "@/lib/valuation";
import { getMacroContext, summarizeMacroForAI } from "@/lib/macro";
import { getCalendar, hasCalendar, summarizeCalendarForAI } from "@/lib/calendar";
import { getNews } from "@/lib/news";
import { computeMetrics } from "@/lib/analytics";
import { evaluateSignals } from "@/lib/signals";
import { technicalForecast } from "@/lib/forecast";
import { getAsset } from "@/lib/assets";

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

const AI_SYSTEM = `Anda analis investasi yang berhati-hati dan jujur soal ketidakpastian. Anda membuat PERKIRAAN (bukan jaminan) persentase perubahan harga aset untuk horizon yang diminta, berdasarkan DATA yang diberikan.

CARA BERPIKIR:
- Mulai dari ACUAN STATISTIK (proyeksi teknikal berbasis tren & volatilitas historis) sebagai titik awal netral.
- Sesuaikan naik/turun HANYA bila ada alasan kuat dari fundamental, valuasi, laporan keuangan, berita, atau makro — dan jelaskan singkat di rationale. Jangan menyimpang jauh dari acuan tanpa alasan jelas.
- Lebar rentang (low→high) HARUS mencerminkan ketidakpastian: makin tinggi volatilitas dan makin panjang horizon, makin lebar. Untuk aset volatil/kripto, lebarkan; jangan terlalu sempit.
- Jika data bertanda mock/contoh atau terbatas, turunkan keyakinan (confidence) dan perlebar rentang.
- Hindari optimisme berlebihan; untuk jangka pendek, jangkar lebih dekat ke acuan statistik.

ATURAN ANGKA: dalam PERSEN (8.5 = +8.5%, -4 = -4%). WAJIB lowReturnPct <= expectedReturnPct <= highReturnPct. Jangan menjanjikan untung. Jangan mengarang fakta.

Balas HANYA JSON valid tanpa teks lain, format persis:
{"expectedReturnPct": number, "lowReturnPct": number, "highReturnPct": number, "confidence": "Rendah"|"Menengah"|"Tinggi", "rationale": "..."}
"confidence" mencerminkan keyakinan Anda (rendah jika data terbatas/aset sangat volatil). "rationale" maksimal ~70 kata, Bahasa Indonesia, sebut 2–3 faktor utama yang paling memengaruhi perkiraan.`;

function pct(v: number | null | undefined): string {
  return v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

async function gatherCandles(symbol: string) {
  if (symbol === "ANTAM-GOLD") return getAntamDailyHistory();
  return getDailyHistory(symbol);
}

interface AiForecast {
  expectedReturnPct: number;
  lowReturnPct: number;
  highReturnPct: number;
  confidence?: string;
  rationale: string;
}

const CONFIDENCE_SET = new Set(["Rendah", "Menengah", "Tinggi"]);

function parseAiJson(text: string): AiForecast | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(text.slice(start, end + 1));
    const e = Number(obj.expectedReturnPct);
    let lo = Number(obj.lowReturnPct);
    let hi = Number(obj.highReturnPct);
    if (![e, lo, hi].every(Number.isFinite)) return null;
    if (lo > hi) [lo, hi] = [hi, lo];
    const conf = typeof obj.confidence === "string" ? obj.confidence.trim() : "";
    return {
      expectedReturnPct: e,
      lowReturnPct: Math.min(lo, e),
      highReturnPct: Math.max(hi, e),
      confidence: CONFIDENCE_SET.has(conf) ? conf : undefined,
      rationale: typeof obj.rationale === "string" ? obj.rationale : "",
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const horizon = Math.max(1, Math.min(120, Number(req.nextUrl.searchParams.get("horizon") ?? 12)));
  const providerKey = req.nextUrl.searchParams.get("provider");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const [quote, ctx] = await Promise.all([
    symbol === "ANTAM-GOLD" ? getAntamQuote() : getQuote(symbol),
    gatherCandles(symbol),
  ]);
  const technical = technicalForecast(ctx.candles, horizon);
  const mock = ctx.mock || quote.mock;

  // Technical only (no provider requested).
  if (!providerKey) {
    return NextResponse.json({ symbol, horizon, currency: quote.currency, price: quote.price, mock, technical });
  }

  const provider = PROVIDERS[providerKey] ?? PROVIDERS.claude;
  if (!process.env[provider.envKey]) {
    return NextResponse.json({
      symbol, horizon, currency: quote.currency, price: quote.price, mock, technical,
      ai: { enabled: false, provider: providerKey, providerLabel: provider.label, note: `Proyeksi AI nonaktif untuk ${provider.label} (${provider.envKey} belum diset).` },
    });
  }

  // Build evidence for the AI forecast.
  const asset = getAsset(symbol);
  const metrics = computeMetrics(ctx.candles);
  const signals = evaluateSignals(ctx.candles);
  const fundamentals: Fundamentals =
    symbol === "ANTAM-GOLD" ? { available: false, metrics: [] } : await getFundamentals(symbol);
  const news = await getNews(symbol);
  const financials = hasFinancials(symbol) ? await getFinancials(symbol) : null;
  const valuation = hasPeerGroup(symbol) ? await getRelativeValuation(symbol) : null;
  const macro = await getMacroContext(symbol);
  const calendar = hasCalendar(symbol) ? await getCalendar(symbol) : null;
  const ret = (l: string) => metrics.returns.find((r) => r.label === l)?.value ?? null;

  const evidence = `ASET: ${asset?.name ?? symbol} (${symbol}) — ${asset?.category ?? "Aset"}
Harga terkini: ${quote.price} ${quote.currency}.
HORIZON PROYEKSI: ${horizon} bulan.

KINERJA & RISIKO: 1B ${pct(ret("1B"))}, YTD ${pct(ret("YTD"))}, 1Th ${pct(ret("1Th"))}, 5Th ${pct(ret("5Th"))}. Volatilitas ${pct(metrics.volatility)}/th, max drawdown ${pct(metrics.maxDrawdown)}, CAGR ${pct(metrics.cagr)}.
TEKNIKAL: ${signals.verdict} (Beli ${signals.buyPct}% / Tahan ${signals.holdPct}% / Jual ${signals.sellPct}%); ${signals.items.map((i) => `${i.label}=${i.signal}`).join(", ")}.
FUNDAMENTAL: ${fundamentals.available ? fundamentals.metrics.map((m) => `${m.label}: ${m.value}`).join("; ") : "terbatas"}.
LAPORAN KEUANGAN: ${financials && financials.available ? summarizeFinancialsForAI(financials).replace(/\n/g, " ") : "terbatas"}.
VALUASI RELATIF: ${valuation && valuation.available ? summarizeValuationForAI(valuation) : "terbatas"}.
KONTEKS MAKRO: ${macro.available ? summarizeMacroForAI(macro) : "terbatas"}.
JADWAL & DIVIDEN: ${calendar && calendar.available ? summarizeCalendarForAI(calendar) : "terbatas"}.
BERITA: ${news.items.slice(0, 5).map((n) => n.title).join(" | ") || "tidak ada"}.
ACUAN STATISTIK (proyeksi teknikal ${horizon} bln): basis ${pct(technical.baseReturnPct)}, rentang ${pct(technical.lowReturnPct)}..${pct(technical.highReturnPct)}.

Beri perkiraan % perubahan untuk ${horizon} bulan ke depan dalam format JSON yang diminta.`;

  try {
    const raw =
      provider.kind === "anthropic"
        ? await callAnthropic(provider.model, evidence)
        : await callDeepseek(provider.model, evidence);
    const parsed = parseAiJson(raw);
    if (!parsed) throw new Error("format respons tidak dikenali");
    return NextResponse.json({
      symbol, horizon, currency: quote.currency, price: quote.price, mock, technical,
      ai: { enabled: true, provider: providerKey, providerLabel: provider.label, model: provider.model, ...parsed },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      symbol, horizon, currency: quote.currency, price: quote.price, mock, technical,
      ai: { enabled: false, provider: providerKey, providerLabel: provider.label, note: `Proyeksi ${provider.label} gagal (${message}).` },
    });
  }
}

async function callAnthropic(model: string, evidence: string): Promise<string> {
  const client = new Anthropic();
  const params = {
    model,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: AI_SYSTEM,
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
        { role: "system", content: AI_SYSTEM },
        { role: "user", content: evidence },
      ],
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: "json_object" },
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
