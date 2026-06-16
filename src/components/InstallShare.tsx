"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function InstallShare() {
  const { canInstall, installed, isIOS, promptInstall } = usePWAInstall();
  const [hint, setHint] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (!ok) setHint("Pemasangan dibatalkan. Anda bisa coba lagi kapan saja.");
      return;
    }
    if (isIOS) {
      setHint(
        "Di iPhone/iPad (Safari): ketuk tombol Bagikan ⬆️ lalu pilih “Tambah ke Layar Utama”.",
      );
    } else {
      setHint(
        "Buka di Chrome/Edge: ketuk ikon Install di address bar, atau menu ⋮ → “Install aplikasi”. (Aplikasi mungkin sudah terpasang.)",
      );
    }
  };

  const handleShare = async () => {
    const url =
      typeof window !== "undefined" ? window.location.origin : "";
    const data = {
      title: "InvestWatcher",
      text: "Pantau harga komoditas, emas Antam & saham US/Indonesia.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      // user cancelled share sheet — do nothing
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Tautan disalin ke clipboard ✓");
      setTimeout(() => setShareMsg(null), 4000);
    } catch {
      setShareMsg(url);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold">Pasang &amp; bagikan</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Pasang sebagai aplikasi di perangkat Anda, atau bagikan ke teman.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleInstall}
          disabled={installed}
          className={
            installed
              ? "btn cursor-default border border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400"
              : "btn-primary"
          }
        >
          {installed ? "✓ Aplikasi sudah terpasang" : "📲 Install aplikasi"}
        </button>
        <button
          onClick={handleShare}
          className="btn border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          🔗 Bagikan aplikasi
        </button>
      </div>

      {hint && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {hint}
        </p>
      )}
      {shareMsg && (
        <p className="mt-3 text-sm text-brand">{shareMsg}</p>
      )}
    </div>
  );
}
