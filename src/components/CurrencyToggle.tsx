"use client";

import { useCurrency, type DisplayMode } from "./CurrencyContext";
import { formatNumber } from "@/lib/format";

const MODES: { key: DisplayMode; label: string }[] = [
  { key: "native", label: "Asli" },
  { key: "USD", label: "USD" },
  { key: "IDR", label: "IDR" },
];

export default function CurrencyToggle() {
  const { mode, setMode, rate, rateMock } = useCurrency();
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === m.key
                ? "bg-brand text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <span className="hidden text-xs text-gray-500 sm:inline">
        1 USD = Rp{formatNumber(rate)}
        {rateMock && <span className="ml-1 text-amber-500">(estimasi)</span>}
      </span>
    </div>
  );
}
