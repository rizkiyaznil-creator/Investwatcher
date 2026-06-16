"use client";

import { useEffect, useState } from "react";

interface Status {
  claude: boolean;
  deepseek: boolean;
}

const PROVIDERS: { key: keyof Status; label: string; env: string }[] = [
  { key: "claude", label: "Claude (Anthropic)", env: "ANTHROPIC_API_KEY" },
  { key: "deepseek", label: "DeepSeek", env: "DEEPSEEK_API_KEY" },
];

export default function AiStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d) => !cancelled && setStatus(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold">Status fitur AI</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Penyedia dengan API key aktif bisa dipakai di kartu “Ulasan AI”. Tanpa
        key, fitur memakai ringkasan otomatis (non-AI).
      </p>

      <ul className="space-y-2">
        {PROVIDERS.map((p) => {
          const active = status?.[p.key];
          return (
            <li
              key={p.key}
              className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {p.label}
                </span>
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  {p.env}
                </span>
              </span>
              {loading ? (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  memeriksa…
                </span>
              ) : active ? (
                <span className="flex items-center gap-1 rounded bg-up/15 px-2 py-0.5 text-xs font-medium text-up">
                  ✓ Aktif
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  ○ Belum diset
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Set API key di environment (mis. Vercel → Settings → Environment
        Variables) lalu redeploy agar status menjadi “Aktif”. Aplikasi tidak
        pernah menampilkan nilai key Anda.
      </p>
    </div>
  );
}
