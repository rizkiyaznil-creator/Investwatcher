"use client";

import { useMemo, useState } from "react";
import { ASSETS } from "@/lib/assets";

interface Props {
  inWatchlist: string[];
  onAdd: (symbol: string) => void;
}

/** Searchable picker to add assets to the watchlist, grouped by category. */
export default function AssetPicker({ inWatchlist, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = ASSETS.filter((a) => {
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !a.symbol.toLowerCase().includes(q) &&
        !a.short.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    const byCat: Record<string, typeof ASSETS> = {};
    for (const a of filtered) {
      (byCat[a.category] ??= []).push(a);
    }
    return byCat;
  }, [query]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary">
        + Tambah aset
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-3 shadow-2xl">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari komoditas / saham…"
              className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            {Object.keys(groups).length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">
                Tidak ada hasil.
              </p>
            )}
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {cat}
                </p>
                <ul className="space-y-0.5">
                  {items.map((a) => {
                    const added = inWatchlist.includes(a.symbol);
                    return (
                      <li key={a.symbol}>
                        <button
                          disabled={added}
                          onClick={() => onAdd(a.symbol)}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                            added
                              ? "cursor-default text-gray-600"
                              : "hover:bg-gray-800"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{a.icon}</span>
                            <span>{a.name}</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {added ? "✓" : "+"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
