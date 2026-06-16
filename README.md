# 📈 InvestWatcher

Aplikasi web untuk **memantau grafik & harga komoditas investasi dunia, emas Antam, serta saham US & Indonesia** — dirancang untuk membantu pengambilan keputusan investasi, bukan sekadar penampil harga.

> ⚠️ Data hanya untuk informasi, **bukan saran investasi**.

## ✨ Fitur (v1 / MVP)

**Inti**
- 📊 **Grafik harga interaktif** (garis & candlestick) dengan pilihan rentang waktu: `1D · 1W · 1M · 3M · 1Y · 5Y`
- 📈 **Perubahan harga & %** harian, dengan warna naik/turun
- ⭐ **Watchlist favorit** (tersimpan di browser, tanpa perlu login)
- ➰ **Mini-chart (sparkline)** di setiap baris watchlist
- 🎯 **Posisi terhadap rentang 52 minggu** (tahu harga relatif mahal/murah)
- 🏅 **Emas Antam**: harga jual, **buyback**, dan **spread** (biaya nyata emas)

**Fitur bantu keputusan (3 tambahan)**
- 🧮 **Indikator teknikal**: Moving Average (MA20 & MA50) + **RSI(14)** dengan zona jenuh beli/jual
- 🔔 **Alert harga**: notifikasi saat harga menembus target (di atas/di bawah)
- 💱 **Konversi mata uang USD ↔ IDR** (komoditas dunia diquote USD; investor lokal butuh rupiah)

**Fitur lanjutan**
- ⚖️ **Perbandingan multi-aset** (`/compare`): beberapa aset dalam satu grafik, dinormalisasi ke % perubahan untuk melihat mana yang outperform
- 📰 **Berita per-aset**: berita terkait pada halaman detail (Google News RSS + fallback contoh)
- 🗄️ **Historis emas Antam**: snapshot harga harian disimpan ke `data/antam-history.json` (di-commit ke repo) lalu ditampilkan sebagai grafik historis nyata

## 🧱 Tech Stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Grafik | TradingView Lightweight Charts |
| Data harga | Yahoo Finance (komoditas, saham US/ID, FX) |
| Emas Antam | Scraping harga-emas.org (best-effort) |
| Penyimpanan | `localStorage` (watchlist, alert, preferensi) |

Data harga diambil on-demand dari sumber data. Untuk emas Antam, histori
disimpan sebagai **JSON store yang di-commit ke repo** (`data/antam-history.json`)
— persisten tanpa server DB, cocok untuk deployment ephemeral/serverless, dan
mudah diganti dengan database sungguhan di kemudian hari.

## 🗄️ Historis emas Antam (snapshot harian)

```bash
node scripts/seed-antam.mjs            # buat data awal (sekali saja)
node scripts/snapshot-antam.mjs        # ambil 1 snapshot hari ini (scrape live)
node scripts/snapshot-antam.mjs --sell 1350000 --buyback 1242000   # manual
```

GitHub Actions (`.github/workflows/antam-snapshot.yml`) menjalankan snapshot tiap
hari (~09:00 WIB) dan meng-commit perubahan otomatis, sehingga grafik historis
emas Antam terus bertambah dari data nyata.

## 🚀 Menjalankan

```bash
npm install
npm run dev      # mode pengembangan -> http://localhost:3000
# atau
npm run build && npm run start
```

## 🌐 Sumber data & catatan jaringan

Yahoo Finance & situs harga emas tidak menyediakan API resmi, sehingga diakses
server-side melalui Next.js API routes (`/api/quotes`, `/api/history`).

Aplikasi punya **lapisan fallback data mock** yang deterministik: bila sumber
data live tidak dapat diakses (mis. host belum masuk **network egress
allowlist** pada lingkungan sandbox), UI tetap berfungsi penuh dengan data
contoh dan menampilkan banner peringatan. Begitu host berikut diizinkan, data
asli otomatis dipakai:

```
query1.finance.yahoo.com
query2.finance.yahoo.com
harga-emas.org
```

## 📁 Struktur

```
src/
  app/
    page.tsx                 # Dashboard (watchlist)
    compare/page.tsx         # Perbandingan multi-aset
    asset/[symbol]/page.tsx  # Detail aset: grafik, indikator, alert, berita
    api/quotes/route.ts      # Quote batch (live + fallback)
    api/history/route.ts     # Data historis OHLC
    api/news/route.ts        # Berita per-aset
  components/                # UI: chart, compare, tabel, picker, alert, news…
  hooks/                     # useWatchlist, useAlerts
  lib/                       # assets, yahoo, antam, antamStore, news, indicators, mock
scripts/                     # seed-antam, snapshot-antam
data/antam-history.json      # store historis emas Antam
.github/workflows/           # antam-snapshot (cron harian)
```

## 🗺️ Rencana berikutnya (ide)

- Portfolio tracker (catat kepemilikan → untung/rugi)
- Kalender ekonomi (rilis data penting)
- Korelasi antar-aset & seasonality komoditas
- Migrasi store emas Antam ke database sungguhan bila kebutuhan bertambah
