"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Asset } from "@/lib/types";
import { ASSETS, ASSET_MAP, makeAsset, resolveStaticAsset } from "@/lib/assets";

interface CatalogValue {
  /** All selectable assets: static featured catalog + user-added custom ones. */
  all: Asset[];
  /** Resolve metadata for any symbol (static, custom, or synthesized). */
  resolve: (symbol: string) => Asset;
  /** Register a custom asset (chosen via search) so it shows proper metadata. */
  addCustom: (asset: Asset) => void;
}

const KEY = "investwatcher.customAssets.v1";
const Ctx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  // Empty on first render (server + hydration) -> populated after mount, so no
  // hydration mismatch for custom symbols.
  const [custom, setCustom] = useState<Record<string, Asset>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setCustom(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const addCustom = useCallback((asset: Asset) => {
    setCustom((prev) => {
      if (ASSET_MAP[asset.symbol] || prev[asset.symbol]) return prev;
      const next = { ...prev, [asset.symbol]: asset };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resolve = useCallback(
    (symbol: string): Asset =>
      ASSET_MAP[symbol] ?? custom[symbol] ?? resolveStaticAsset(symbol),
    [custom],
  );

  const all = useMemo(
    () => [...ASSETS, ...Object.values(custom)],
    [custom],
  );

  const value: CatalogValue = { all, resolve, addCustom };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog must be used within CatalogProvider");
  return v;
}

export { makeAsset };
