import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";
import ThemeToggle from "@/components/ThemeToggle";
import { THEME_INIT_SCRIPT } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "InvestWatcher — Pantau Harga Komoditas & Saham",
  description:
    "Pantau grafik & harga komoditas dunia, emas Antam, serta saham US & Indonesia untuk membantu keputusan investasi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <span className="text-lg font-bold tracking-tight">
                Invest<span className="text-brand">Watcher</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="btn-ghost">
                Dashboard
              </Link>
              <Link href="/compare" className="btn-ghost">
                Bandingkan
              </Link>
              <Link href="/about" className="btn-ghost">
                Tentang
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
          InvestWatcher · Data hanya untuk informasi, bukan saran investasi.
        </footer>
        </Providers>
      </body>
    </html>
  );
}
