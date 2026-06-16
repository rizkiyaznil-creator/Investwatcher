"use client";

import { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { formatNumber } from "@/lib/format";

interface Props {
  symbol: string;
  currentPrice?: number;
}

/** Create & manage price alerts for a single asset. */
export default function AlertPanel({ symbol, currentPrice }: Props) {
  const { forSymbol, add, remove } = useAlerts();
  const alerts = forSymbol(symbol);

  const [direction, setDirection] = useState<"above" | "below">("above");
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(value.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;
    add({ symbol, direction, target });
    setValue("");
  };

  return (
    <div className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        🔔 Alert harga
      </h3>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "above" | "below")}
          className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="above">Naik ke / di atas</option>
          <option value="below">Turun ke / di bawah</option>
        </select>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            currentPrice ? formatNumber(currentPrice) : "harga target"
          }
          className="w-32 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button type="submit" className="btn-primary">
          Tambah
        </button>
      </form>

      {alerts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2 text-sm"
            >
              <span>
                {a.direction === "above" ? "≥" : "≤"}{" "}
                <span className="font-medium tabular-nums">
                  {formatNumber(a.target)}
                </span>
                {a.triggeredAt ? (
                  <span className="ml-2 rounded bg-brand/20 px-1.5 py-0.5 text-xs text-brand">
                    tercapai
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-gray-500">aktif</span>
                )}
              </span>
              <button
                onClick={() => remove(a.id)}
                className="text-gray-500 hover:text-down"
                title="Hapus alert"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-600">
        Alert dievaluasi setiap kali harga diperbarui (~tiap menit) selama tab
        terbuka. Notifikasi browser akan muncul bila diizinkan.
      </p>
    </div>
  );
}
