#!/usr/bin/env node
/**
 * One-off seed generator for data/antam-history.json.
 *
 * Produces a plausible historical daily series so the Emas Antam chart is
 * immediately useful. Real daily snapshots (scripts/snapshot-antam.mjs) append
 * onto this file going forward. Re-running overwrites the seed — only run once,
 * or to regenerate before any real snapshots exist.
 *
 * Usage: node scripts/seed-antam.mjs [days]
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "antam-history.json");

const days = Number(process.argv[2] ?? 420);

// Seeded PRNG for reproducible output.
let s = 1234567;
function rng() {
  s = (s * 1103515245 + 12345) & 0x7fffffff;
  return s / 0x7fffffff;
}

function round500(n) {
  return Math.round(n / 500) * 500; // Antam quotes in Rp500 steps
}

const points = [];
let price = 1_150_000; // ~start
const target = 1_345_000; // ~end
for (let i = days - 1; i >= 0; i--) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - i);
  const date = d.toISOString().slice(0, 10);
  const drift = (target - price) / (i + 1); // pull toward target over time
  const noise = (rng() - 0.5) * 2 * price * 0.006;
  price = Math.max(900_000, price + drift + noise);
  const sell = round500(price);
  const buyback = round500(sell * 0.92);
  points.push({ date, sell, buyback });
}

const store = { unit: "per gram", currency: "IDR", points };
await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n", "utf-8");
console.log(`✓ seeded ${points.length} titik (${points[0].date} → ${points[points.length - 1].date})`);
