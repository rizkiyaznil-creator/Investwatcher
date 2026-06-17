import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";
import ThemeToggle from "@/components/ThemeToggle";
import AuthMenu from "@/components/AuthMenu";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { THEME_INIT_SCRIPT } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "InvestWatcher — Pantau Harga Komoditas & Saham",
  description:
    "Pantau grafik & harga komoditas dunia, emas Antam, serta saham US & Indonesia untuk membantu keputusan investasi.",
  applicationName: "InvestWatcher",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InvestWatcher",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
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
        <ServiceWorkerRegister />
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
              <Link href="/peluang" className="btn-ghost">
                Peluang
              </Link>
              <Link href="/compare" className="btn-ghost">
                Bandingkan
              </Link>
              <Link href="/analysis" className="btn-ghost">
                Analisis
              </Link>
              <Link href="/about" className="btn-ghost">
                Tentang
              </Link>
              <ThemeToggle />
              <AuthMenu />
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
