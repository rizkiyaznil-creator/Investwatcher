"use client";

import { useEffect, useMemo, useState } from "react";
import { makeAsset, iconForType } from "@/lib/assets";
import type { SearchResult } from "@/lib/search";
import { useCatalog } from "./CatalogContext";

interface Props {
  inWatchlist: string[];
  onAdd: (symbol: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  commodity: "Komoditas",
  stock_us: "Saham US",
  stock_id: "Saham ID",
  gold_antam: "Emas Antam",
  crypto: "Kripto",
  index: "Indeks",
  etf: "ETF",
  fx: "Mata Uang",
  other: "Lainnya",
};

/** Picker with live universe search (Yahoo) + browsable featured catalog. */
export default function AssetPicker({ inWatchlist, onAdd }: Props) {
  const { all, addCustom } = useCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMock, setSearchMock] = useState(false);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setResults(d.results ?? []);
          setSearchMock(!!d.mock);
        })
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Featured catalog grouped by category (for browsing when not searching).
  const groups = useMemo(() => {
    const byCat: Record<string, typeof all> = {};
    for (const a of all) (byCat[a.category] ??= []).push(a);
    return byCat;
  }, [all]);

  const addResult = (r: SearchResult) => {
    if (!r.inCatalog) {
      addCustom(
        makeAsset({
          symbol: r.symbol,
          name: r.name,
          type: r.type,
          currency: r.currency,
        }),
      );
    }
    onAdd(r.symbol);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary">
        + Tambah aset
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-40 mt-2 max-h-[75vh] w-96 max-w-[90vw] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari saham US/Indonesia, komoditas, kripto…"
              className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mb-3 px-1 text-[11px] text-slate-400">
              Ketik nama atau kode (mis. <span className="font-mono">BMRI.JK</span>,{" "}
              <span className="font-mono">TSLA</span>,{" "}
              <span className="font-mono">BTC-USD</span>).
            </p>

            {query.trim().length >= 1 ? (
              /* Live search results */
              <div>
                {searching && (
                  <p className="py-2 text-center text-sm text-slate-400">Mencari…</p>
                )}
                {!searching && results.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    Tidak ada hasil untuk “{query.trim()}”.
                  </p>
                )}
                {searchMock && results.length > 0 && (
                  <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                    Pencarian online belum bisa diakses — menampilkan dari daftar bawaan.
                  </p>
                )}
                <ul className="space-y-0.5">
                  {results.map((r) => {
                    const added = inWatchlist.includes(r.symbol);
                    return (
                      <li key={r.symbol}>
                        <button
                          disabled={added}
                          onClick={() => addResult(r)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                            added ? "cursor-default text-slate-400" : "hover:bg-slate-100"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span>{iconForType(r.type)}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-slate-800">{r.name}</span>
                              <span className="block text-xs text-slate-400">
                                <span className="font-mono">{r.symbol}</span>
                                {" · "}
                                {TYPE_LABEL[r.type] ?? r.type}
                                {r.exchange ? ` · ${r.exchange}` : ""}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {added ? "✓" : "+ tambah"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              /* Featured catalog browse */
              Object.entries(groups).map(([cat, items]) => (
                <div key={cat} className="mb-3">
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                              added ? "cursor-default text-slate-400" : "hover:bg-slate-100"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{a.icon}</span>
                              <span>{a.name}</span>
                            </span>
                            <span className="text-xs text-slate-400">{added ? "✓" : "+"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
