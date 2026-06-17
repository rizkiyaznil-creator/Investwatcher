import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getQuote, getDailyHistory } from "@/lib/yahoo";
import { getAntamQuote, getAntamDailyHistory } from "@/lib/antam";
import { getFundamentals, type Fundamentals } from "@/lib/fundamentals";
import { getFinancials, hasFinancials, summarizeFinancialsForAI } from "@/lib/financials";
import { getNews } from "@/lib/news";
import { computeMetrics } from "@/lib/analytics";
import { evaluateSignals } from "@/lib/signals";
import { getAsset } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProviderKind = "anthropic" | "deepseek";

interface Provider {
  label: string;
  model: string;
  kind: ProviderKind;
  /** Env var holding the API key. */
  envKey: string;
}

const PROVIDERS: Record<string, Provider> = {
  claude: { label: "Claude", model: "claude-opus-4-8", kind: "anthropic", envKey: "ANTHROPIC_API_KEY" },
  "deepseek-chat": { label: "DeepSeek V3", model: "deepseek-chat", kind: "deepseek", envKey: "DEEPSEEK_API_KEY" },
  "deepseek-reasoner": { label: "DeepSeek R1", model: "deepseek-reasoner", kind: "deepseek", envKey: "DEEPSEEK_API_KEY" },
};

const SYSTEM = `Anda adalah analis investasi senior yang objektif, berhati-hati, dan jujur soal ketidakpastian. Anda menulis untuk investor ritel Indonesia (sebagian pemula): gunakan Bahasa Indonesia yang jelas dan jelaskan istilah teknis seperlunya.

TUGAS: beri ULASAN ringkas, SEIMBANG, dan DAPAT DITINDAKLANJUTI atas satu aset, HANYA berdasarkan DATA yang diberikan (harga, kinerja & risiko, teknikal, fundamental, laporan keuangan, berita).

CARA BERPIKIR (lakukan di kepala — JANGAN tulis sebagai langkah bernomor):
1) Nilai dulu kualitas & keterbaruan data. Jika ada penanda "mock/contoh" atau "terbatas", turunkan keyakinan dan sampaikan terus terang.
2) Sesuaikan lensa dengan kelas aset:
   - Saham → valuasi (P/E, P/B vs sejarah/sektor), pertumbuhan & profitabilitas (pendapatan, margin, laba bersih, ROE), kesehatan neraca (utang vs ekuitas, kas), arus kas bebas; baru tren harga & sentimen.
   - Komoditas/FX/indeks → makro, tren, musiman, momentum; fundamental emiten tidak relevan.
   - Kripto → sangat spekulatif: tren, likuiditas, sentimen; tegaskan risiko tinggi.
3) Timbang bukti sesuai horizon: untuk menengah–panjang, bobot valuasi & kualitas fundamental LEBIH besar daripada momentum jangka pendek; untuk jangka pendek, teknikal & berita lebih relevan.
4) Damaikan sinyal yang bertentangan secara eksplisit (mis. "tren naik tapi valuasi sudah mahal"). JANGAN sekadar mengulang kesimpulan teknikal.
5) Tetapkan tingkat keyakinan dari seberapa selaras bukti dan sebaik apa kualitas datanya.

ATURAN:
- Jangan mengarang angka/fakta yang tidak ada di data; jika tidak diketahui, katakan.
- Sikap selalu bertahap (akumulasi/kurangi bertahap) atau tahan — tidak ada ajakan all-in.
- Jangan menjanjikan atau menjamin untung; nyatakan ketidakpastian dengan jujur.
- Hindari bias terkini (recency bias) dan jangan terpaku pada satu angka saja.
- Sebutkan angka kunci dari data bila relevan (mis. pertumbuhan laba, P/E, drawdown), bukan klaim umum.

FORMAT JAWABAN — gunakan sub-judul tebal PERSIS ini, ringkas, total ~250–340 kata:
**Kesimpulan:** [Akumulasi bertahap / Tahan / Kurangi bertahap] — Keyakinan: [Rendah / Menengah / Tinggi]. Lalu 1 kalimat alasan inti.
**Alasan utama:** 2–4 poin (gabungan fundamental + teknikal + berita; sertakan angka kunci).
**Risiko utama:** 2–3 poin.
**Yang membatalkan tesis ini:** 1 kalimat — kondisi, level harga, atau angka yang jika terjadi membuat pandangan ini keliru.
**Langkah praktis:** horizon waktu, ukuran posisi yang wajar, akumulasi bertahap (DCA), dan stop-loss konseptual.
**⚠️ Ini analisis edukatif, bukan saran investasi. Lakukan riset mandiri.**`;

function pct(v: number | null | undefined): string {
  return v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

async function gatherCandles(symbol: string) {
  if (symbol === "ANTAM-GOLD") return getAntamDailyHistory();
  return getDailyHistory(symbol);
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const providerKey = req.nextUrl.searchParams.get("provider") ?? "claude";
  const provider = PROVIDERS[providerKey] ?? PROVIDERS.claude;
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const asset = getAsset(symbol);
  const name = asset?.name ?? symbol;
  const typeLabel = asset?.category ?? "Aset";

  const [quote, ctx, fundamentals, news, financials] = await Promise.all([
    symbol === "ANTAM-GOLD" ? getAntamQuote() : getQuote(symbol),
    gatherCandles(symbol),
    symbol === "ANTAM-GOLD" ? Promise.resolve<Fundamentals>({ available: false, metrics: [] }) : getFundamentals(symbol),
    getNews(symbol),
    hasFinancials(symbol) ? getFinancials(symbol) : Promise.resolve(null),
  ]);

  const metrics = computeMetrics(ctx.candles);
  const signals = evaluateSignals(ctx.candles);
  const dataMock = ctx.mock || quote.mock;

  const ret = (label: string) =>
    metrics.returns.find((r) => r.label === label)?.value ?? null;

  const fundText = fundamentals.available
    ? [
        fundamentals.sector ? `Sektor: ${fundamentals.sector}${fundamentals.industry ? " / " + fundamentals.industry : ""}` : null,
        ...fundamentals.metrics.map((m) => `${m.label}: ${m.value}`),
        fundamentals.analyst?.recommendation ? `Rekomendasi analis: ${fundamentals.analyst.recommendation}` : null,
        fundamentals.analyst?.targetMean ? `Target harga rata-rata analis: ${fundamentals.analyst.targetMean}` : null,
      ].filter(Boolean).join("\n")
    : "Tidak tersedia (umum untuk komoditas, kripto, indeks, atau saat sumber data terbatas).";

  const newsText = news.items.length
    ? news.items.slice(0, 6).map((n) => `- ${n.title} (${n.source})`).join("\n")
    : "Tidak ada berita.";

  const evidence = `ASET: ${name} (${symbol}) — ${typeLabel}
Harga terkini: ${quote.price} ${quote.currency}, perubahan hari ini ${pct(quote.changePercent)}.

== KINERJA & RISIKO ==
Imbal hasil: 1B ${pct(ret("1B"))}, 3B ${pct(ret("3B"))}, YTD ${pct(ret("YTD"))}, 1Th ${pct(ret("1Th"))}, 3Th ${pct(ret("3Th"))}, 5Th ${pct(ret("5Th"))}.
Volatilitas tahunan: ${pct(metrics.volatility)}. Max drawdown: ${pct(metrics.maxDrawdown)}. CAGR: ${pct(metrics.cagr)}. Rasio imbal/risiko: ${metrics.riskReward?.toFixed(2) ?? "n/a"}. (berdasarkan ~${metrics.spanYears?.toFixed(1) ?? "?"} tahun data)

== TEKNIKAL (ringkasan sinyal) ==
Kesimpulan teknikal: ${signals.verdict} (Beli ${signals.buyPct}% / Tahan ${signals.holdPct}% / Jual ${signals.sellPct}%).
Rincian: ${signals.items.map((i) => `${i.label}=${i.signal}`).join(", ")}.

== FUNDAMENTAL ==
${fundText}

== LAPORAN KEUANGAN (ringkasan tahunan) ==
${financials && financials.available ? summarizeFinancialsForAI(financials) : "Tidak tersedia."}

== BERITA TERKINI ==
${newsText}

${dataMock ? "CATATAN: sebagian data adalah contoh (mock) karena sumber live terbatas; sampaikan keterbatasan ini." : ""}

Tulis ulasan analisis Anda berdasarkan data di atas.`;

  // No key for the chosen provider → heuristic fallback.
  if (!process.env[provider.envKey]) {
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      mock: dataMock,
      text: heuristicReview(name, signals, metrics, fundamentals.available, news.items.length, ret),
      note: `Ulasan AI nonaktif untuk ${provider.label} (${provider.envKey} belum diset). Menampilkan ringkasan otomatis non-AI. Set ${provider.envKey} di environment lalu redeploy.`,
    });
  }

  try {
    const text =
      provider.kind === "anthropic"
        ? await callAnthropic(provider.model, evidence)
        : await callDeepseek(provider.model, evidence);
    return NextResponse.json({
      enabled: true,
      provider: providerKey,
      providerLabel: provider.label,
      model: provider.model,
      mock: dataMock,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      enabled: false,
      provider: providerKey,
      providerLabel: provider.label,
      mock: dataMock,
      text: heuristicReview(name, signals, metrics, fundamentals.available, news.items.length, ret),
      note: `Ulasan ${provider.label} gagal dibuat (${message}). Menampilkan ringkasan otomatis non-AI.`,
    });
  }
}

async function callAnthropic(model: string, evidence: string): Promise<string> {
  const client = new Anthropic();
  // adaptive thinking + effort may not be typed in the installed SDK version.
  const params = {
    model,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{ role: "user", content: evidence }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;
  const msg = await client.messages.create(params);
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
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
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  const json = await res.json();
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("respons kosong");
  return text.trim();
}

function heuristicReview(
  name: string,
  signals: ReturnType<typeof evaluateSignals>,
  metrics: ReturnType<typeof computeMetrics>,
  hasFundamentals: boolean,
  newsCount: number,
  ret: (l: string) => number | null,
): string {
  const stanceMap: Record<string, string> = {
    "Beli Kuat": "cenderung akumulasi bertahap",
    Beli: "cenderung akumulasi bertahap",
    Tahan: "tahan / netral",
    Jual: "kurangi bertahap",
    "Jual Kuat": "kurangi bertahap",
  };
  const stance = stanceMap[signals.verdict] ?? "tahan / netral";
  const vol = metrics.volatility;
  const risk = vol == null ? "tidak diketahui" : vol > 30 ? "tinggi" : vol > 15 ? "menengah" : "relatif rendah";
  return [
    `Ringkasan untuk ${name}:`,
    "",
    `• Teknikal: sinyal saat ini ${signals.verdict} (Beli ${signals.buyPct}% / Tahan ${signals.holdPct}% / Jual ${signals.sellPct}%) → sikap ${stance}.`,
    `• Kinerja: 1 tahun ${ret("1Th") == null ? "n/a" : (ret("1Th")! >= 0 ? "+" : "") + ret("1Th")!.toFixed(1) + "%"}, CAGR ${metrics.cagr == null ? "n/a" : metrics.cagr.toFixed(1) + "%"}.`,
    `• Risiko: volatilitas ${risk}${vol != null ? ` (${vol.toFixed(0)}%/th)` : ""}, max drawdown ${metrics.maxDrawdown == null ? "n/a" : metrics.maxDrawdown.toFixed(0) + "%"}. Sesuaikan ukuran posisi & horizon.`,
    `• Fundamental: ${hasFundamentals ? "tersedia (lihat panel terkait)" : "terbatas untuk aset ini"}. Berita terkait: ${newsCount} item.`,
    "",
    "Manajemen risiko: pertimbangkan diversifikasi, akumulasi bertahap (DCA) ketimbang sekaligus, dan tentukan batas risiko sebelum masuk.",
    "",
    "⚠️ Ini ringkasan otomatis (non-AI) yang edukatif, bukan saran investasi. Lakukan riset mandiri.",
  ].join("\n");
}
