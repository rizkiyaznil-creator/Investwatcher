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

## 🧱 Tech Stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Grafik | TradingView Lightweight Charts |
| Data harga | Yahoo Finance (komoditas, saham US/ID, FX) |
| Emas Antam | Scraping harga-emas.org (best-effort) |
| Penyimpanan | `localStorage` (watchlist, alert, preferensi) |

Tidak ada database di v1 — data historis diambil on-demand dari sumber data.

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
    asset/[symbol]/page.tsx  # Detail aset: grafik, indikator, alert
    api/quotes/route.ts      # Quote batch (live + fallback)
    api/history/route.ts     # Data historis OHLC
  components/                # UI: chart, tabel, picker, alert, dll.
  hooks/                     # useWatchlist, useAlerts
  lib/                       # assets catalog, yahoo, antam, indicators, mock
```

## 🗺️ Rencana berikutnya (ide)

- Berita per-aset & kalender ekonomi
- Portfolio tracker (catat kepemilikan → untung/rugi)
- Perbandingan beberapa aset dalam satu grafik (normalisasi %)
- Korelasi antar-aset & seasonality komoditas
- Penyimpanan historis harian untuk emas Antam (butuh DB + scheduler)
