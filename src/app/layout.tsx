import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";

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
    <html lang="id" className="dark">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-gray-800 bg-[#0b0f17]/80 backdrop-blur">
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
              <a
                href="https://code.claude.com/docs/en/claude-code-on-the-web"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost text-gray-500"
              >
                Bantuan
              </a>
            </nav>
          </div>
        </header>
        <Providers>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-gray-600">
          InvestWatcher · Data hanya untuk informasi, bukan saran investasi.
        </footer>
      </body>
    </html>
  );
}
