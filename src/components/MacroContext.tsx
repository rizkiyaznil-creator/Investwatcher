"use client";

import { useEffect, useState } from "react";
import type { MacroContext as MacroData, MacroIndicator } from "@/lib/macro";
import { fmtValue, fmtChange } from "@/lib/macro";
import InfoTip from "./InfoTip";

function changeColor(v: number | null): string {
  if (v == null) return "text-slate-400 dark:text-slate-500";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-slate-500 dark:text-slate-400";
}

export default function MacroContext({ symbol }: { symbol: string }) {
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/macro?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: MacroData) => !cancelled && setMacro(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading && !macro) return null;
  if (!macro || !macro.available || macro.indicators.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold">
        🌐{" "}
        <InfoTip text="Kondisi pasar yang lebih luas yang biasanya memengaruhi aset ini: nilai dolar (DXY), suku bunga acuan global (yield surat utang AS), sentimen risiko (VIX), serta pasar/mata uang terkait. Naik/turun = perubahan 1 bulan terakhir.">
          Konteks Makro
        </InfoTip>
      </h2>

      {macro.mock && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ Sebagian angka contoh (mock) — sumber live terbatas di lingkungan ini.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {macro.indicators.map((i: MacroIndicator) => (
          <div
            key={i.symbol}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={i.label}>
              {i.label}
            </div>
            <div className="mt-0.5 text-base font-semibold tabular-nums">{fmtValue(i)}</div>
            <div className="mt-0.5 flex items-center justify-between text-xs tabular-nums">
              <span className={changeColor(i.chg1m)}>{fmtChange(i, i.chg1m)}</span>
              <span className="text-slate-400 dark:text-slate-500" title="Perubahan year-to-date">
                YTD <span className={changeColor(i.ytd)}>{fmtChange(i, i.ytd)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Perubahan 1 bulan terakhir & sejak awal tahun (YTD). Untuk yield, perubahan dalam poin
        persen (pp). Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
