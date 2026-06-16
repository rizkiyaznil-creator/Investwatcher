// Utilitas dev: ambil screenshot beberapa halaman dari app yang sedang berjalan
// di http://localhost:3000. Butuh puppeteer (tidak termasuk dependency utama):
//   npm install --no-save puppeteer && npx puppeteer browsers install chrome
//   npm run start &           # jalankan app dulu
//   node scripts/shoot.mjs    # hasil di /tmp/shot-*.png
import puppeteer from "puppeteer";

const shots = [
  { url: "http://localhost:3000/", out: "/tmp/shot-dashboard.png", wait: 2500 },
  { url: "http://localhost:3000/asset/GC%3DF", out: "/tmp/shot-detail.png", wait: 3500 },
  { url: "http://localhost:3000/compare", out: "/tmp/shot-compare.png", wait: 3500 },
];

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1.5 });

for (const s of shots) {
  await page.goto(s.url, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, s.wait));
  await page.screenshot({ path: s.out, fullPage: true });
  console.log("shot:", s.out);
}

await browser.close();
console.log("done");
