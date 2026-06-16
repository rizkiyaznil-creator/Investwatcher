import { getAsset } from "./assets";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: number; // unix seconds
}

export interface NewsResult {
  items: NewsItem[];
  mock: boolean;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Build a sensible search query for an asset. */
function queryFor(symbol: string): string {
  const asset = getAsset(symbol);
  if (!asset) return symbol;
  switch (asset.type) {
    case "commodity":
      return `harga ${asset.short}`;
    case "gold_antam":
      return "harga emas Antam";
    case "stock_us":
      return `${asset.name} stock`;
    case "stock_id":
      return `saham ${asset.short}`;
    case "fx":
      return "kurs rupiah dollar";
    default:
      return asset.name;
  }
}

/** Minimal RSS <item> parser (no external dependency). */
function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item>/).slice(1);
  for (const block of blocks) {
    const body = block.split("</item>")[0];
    const title = decode(pick(body, "title"));
    const link = decode(pick(body, "link"));
    const pub = pick(body, "pubDate");
    const source = decode(pick(body, "source")) || hostOf(link);
    if (!title || !link) continue;
    const ts = pub ? Math.floor(new Date(pub).getTime() / 1000) : 0;
    items.push({ title, url: link, source: source || "Berita", publishedAt: ts });
    if (items.length >= 12) break;
  }
  return items;
}

function pick(body: string, tag: string): string {
  const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function getNews(symbol: string): Promise<NewsResult> {
  const q = queryFor(symbol);
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    q,
  )}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRss(xml);
      if (items.length) return { items, mock: false };
    }
  } catch {
    /* fall through to mock */
  }
  return { items: mockNews(symbol), mock: true };
}

function mockNews(symbol: string): NewsItem[] {
  const asset = getAsset(symbol);
  const name = asset?.short ?? symbol;
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  const templates = [
    `Analis pasar memperkirakan ${name} bergerak fluktuatif pekan ini`,
    `Sentimen global pengaruhi pergerakan harga ${name}`,
    `${name} ditutup menguat, investor cermati data ekonomi terbaru`,
    `Faktor permintaan dorong perubahan harga ${name}`,
    `Apa yang perlu diperhatikan investor soal ${name} bulan ini`,
  ];
  return templates.map((title, i) => ({
    title,
    url: "#",
    source: "Contoh Berita",
    publishedAt: now - i * (day / 2),
  }));
}
