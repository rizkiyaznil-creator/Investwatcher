// Utilitas dev: ambil screenshot beberapa halaman dari app yang sedang berjalan
// di http://localhost:3000. Butuh puppeteer (tidak termasuk dependency utama):
//   npm install --no-save puppeteer && npx puppeteer browsers install chrome
//   npm run start &           # jalankan app dulu
//   node scripts/shoot.mjs    # hasil di /tmp/shot-*.png
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

// Desktop shots
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1.5 });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
// Hover the "Posisi 52 minggu" info marker to reveal a tooltip
try {
  const markers = await page.$$('[aria-label="Penjelasan"]');
  if (markers.length) await markers[markers.length - 1].hover();
  await new Promise((r) => setTimeout(r, 600));
} catch {}
await page.screenshot({ path: "/tmp/shot-dashboard.png", fullPage: true });
console.log("shot: dashboard (with tooltip)");

await page.goto("http://localhost:3000/asset/GC%3DF", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: "/tmp/shot-detail.png", fullPage: true });
console.log("shot: detail");

await page.goto("http://localhost:3000/compare", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: "/tmp/shot-compare.png", fullPage: true });
console.log("shot: compare");

// Mobile shot
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await m.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
await m.screenshot({ path: "/tmp/shot-mobile.png", fullPage: true });
console.log("shot: mobile");

await browser.close();
console.log("done");
