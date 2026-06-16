import Link from "next/link";
import type { Metadata } from "next";
import InstallShare from "@/components/InstallShare";

export const metadata: Metadata = {
  title: "Tentang — InvestWatcher",
  description:
    "Tentang aplikasi InvestWatcher: pemantau harga komoditas, emas Antam, dan saham US/Indonesia.",
};

const FEATURES = [
  ["📊", "Grafik & riwayat harga", "Grafik garis/candlestick dengan rentang 1D–5Y, indikator MA & RSI."],
  ["⭐", "Watchlist favorit", "Pilih aset prioritas, atur urutan dengan drag-and-drop."],
  ["🔎", "Pencarian universe", "Cari saham US/Indonesia, komoditas, kripto, indeks apa pun."],
  ["🔔", "Alert harga", "Notifikasi saat harga menembus target yang Anda tetapkan."],
  ["💱", "Konversi USD ↔ IDR", "Komoditas/saham global otomatis dikonversi ke rupiah."],
  ["🏅", "Emas Antam", "Harga jual, buyback, dan spread khusus emas Antam."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Hero */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📈</span>
          <h1 className="text-2xl font-bold">
            Invest<span className="text-brand">Watcher</span>
          </h1>
        </div>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          InvestWatcher adalah aplikasi web untuk{" "}
          <strong>memantau grafik &amp; harga komoditas dunia, emas Antam,
          serta saham US dan Indonesia</strong> — dirancang untuk membantu
          Anda mengambil keputusan investasi, bukan sekadar menampilkan harga.
        </p>
      </div>

      {/* Features */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Fitur utama</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data & tech */}
      <div className="card p-6">
        <h2 className="mb-3 text-lg font-semibold">Sumber data &amp; teknologi</h2>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            • Data harga komoditas, saham, dan kurs bersumber dari{" "}
            <strong>Yahoo Finance</strong>; harga Emas Antam diperkuat dari
            sumber lokal serta estimasi dari harga emas dunia.
          </li>
          <li>
            • Dibangun dengan <strong>Next.js, TypeScript, Tailwind CSS</strong>, dan{" "}
            <strong>TradingView Lightweight Charts</strong>.
          </li>
          <li>
            • Mendukung tema <strong>terang, gelap</strong>, atau mengikuti{" "}
            <strong>pengaturan sistem</strong>.
          </li>
        </ul>
      </div>

      {/* Install & share */}
      <InstallShare />

      {/* Credit */}
      <div className="card p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Didesain oleh</p>
        <p className="mt-1 text-xl font-bold text-brand">Muhammad Rizki Yaznil</p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        ⚠️ Data hanya untuk informasi dan edukasi, <strong>bukan saran investasi</strong>.
        Selalu lakukan riset mandiri sebelum mengambil keputusan.
      </div>
    </div>
  );
}
