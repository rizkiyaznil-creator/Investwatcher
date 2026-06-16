"use client";

import { useTheme, type ThemeMode } from "./ThemeContext";

const OPTIONS: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "light", label: "Terang", icon: "☀️" },
  { key: "system", label: "Sistem", icon: "🖥️" },
  { key: "dark", label: "Gelap", icon: "🌙" },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div
      className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
      role="group"
      aria-label="Pilih tema"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => setMode(o.key)}
          title={o.label}
          aria-pressed={mode === o.key}
          className={`rounded-md px-1.5 py-1 text-sm transition-colors ${
            mode === o.key
              ? "bg-white text-brand shadow-sm dark:bg-slate-700"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          <span aria-hidden>{o.icon}</span>
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
