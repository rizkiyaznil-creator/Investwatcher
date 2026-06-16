#!/usr/bin/env node
/**
 * Daily snapshot of Emas Antam prices.
 *
 * Scrapes the current sell & buyback price per gram and appends today's record
 * to data/antam-history.json (the historical "database"). Intended to be run on
 * a schedule (see .github/workflows/antam-snapshot.yml), which commits the
 * updated file back to the repo.
 *
 * Usage:
 *   node scripts/snapshot-antam.mjs            # scrape live
 *   node scripts/snapshot-antam.mjs --sell 1350000 --buyback 1242000   # manual
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "antam-history.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function extractRupiah(html, re) {
  const m = html.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 100_000 ? n : null;
}

async function scrape() {
  const res = await fetch("https://harga-emas.org/", {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const sell = extractRupiah(html, /per\s*gram[^0-9]{0,40}([0-9.]{6,})/i);
  const buyback = extractRupiah(html, /buyback[^0-9]{0,40}([0-9.]{6,})/i);
  if (!sell) throw new Error("gagal mengekstrak harga jual");
  return { sell, buyback: buyback ?? Math.round(sell * 0.92) };
}

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.points)) return parsed;
  } catch {}
  return { unit: "per gram", currency: "IDR", points: [] };
}

async function main() {
  const manualSell = arg("sell");
  let data;
  if (manualSell) {
    const sell = Number(manualSell);
    const buyback = Number(arg("buyback") ?? Math.round(sell * 0.92));
    data = { sell, buyback };
  } else {
    data = await scrape();
  }

  const date = new Date().toISOString().slice(0, 10);
  const store = await readStore();
  const idx = store.points.findIndex((p) => p.date === date);
  const point = { date, sell: data.sell, buyback: data.buyback, source: "live" };
  if (idx >= 0) store.points[idx] = point;
  else store.points.push(point);
  store.points.sort((a, b) => (a.date < b.date ? -1 : 1));

  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n", "utf-8");
  console.log(`✓ snapshot ${date}: jual=${point.sell} buyback=${point.buyback} (total ${store.points.length} titik)`);
}

main().catch((err) => {
  console.error("✗ snapshot gagal:", err.message);
  process.exit(1);
});
