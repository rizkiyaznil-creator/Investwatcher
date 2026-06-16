"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DisplayMode = "native" | "USD" | "IDR";

interface CurrencyValue {
  mode: DisplayMode;
  setMode: (m: DisplayMode) => void;
  /** Latest USD->IDR rate (1 USD = rate IDR). */
  rate: number;
  rateMock: boolean;
  /** Convert a value given its native currency into the active display currency. */
  convert: (value: number, native: string) => { value: number; currency: string };
}

const Ctx = createContext<CurrencyValue | null>(null);

const FALLBACK_RATE = 16200;
const KEY = "investwatcher.display.v1";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DisplayMode>("native");
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [rateMock, setRateMock] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as DisplayMode | null;
      if (saved === "native" || saved === "USD" || saved === "IDR") {
        setModeState(saved);
      }
    } catch {}

    let cancelled = false;
    fetch("/api/quotes?symbols=IDR%3DX")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const q = d.quotes?.[0];
        if (q?.price) {
          setRate(q.price);
          setRateMock(Boolean(q.mock));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = (m: DisplayMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  };

  const convert = useMemo(() => {
    return (value: number, native: string) => {
      const target = mode === "native" ? native : mode;
      if (target === native) return { value, currency: native };
      if (native === "USD" && target === "IDR") {
        return { value: value * rate, currency: "IDR" };
      }
      if (native === "IDR" && target === "USD") {
        return { value: value / rate, currency: "USD" };
      }
      return { value, currency: native };
    };
  }, [mode, rate]);

  const val: CurrencyValue = { mode, setMode, rate, rateMock, convert };
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrency must be used within CurrencyProvider");
  return v;
}
