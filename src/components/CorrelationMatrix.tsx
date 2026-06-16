"use client";

import { useEffect, useState } from "react";
import { useCatalog } from "./CatalogContext";
import InfoTip from "./InfoTip";

interface Props {
  symbols: string[];
}

interface Data {
  symbols: string[];
  matrix: (number | null)[][];
  sampleSize: number;
  mock: boolean;
}

/** Background color for a correlation value (warm = bergerak searah, cool = diversifying). */
function cellStyle(r: number | null): React.CSSProperties {
  if (r == null) return {};
  const a = 0.1 + Math.min(1, Math.abs(r)) * 0.5;
  const color = r >= 0 ? `239,68,68` : `16,185,129`; // red / emerald
  return { backgroundColor: `rgba(${color},${a.toFixed(2)})` };
}

export default function CorrelationMatrix({ symbols }: Props) {
  const { resolve } = useCatalog();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbols.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/correlation?symbols=${encodeURIComponent(symbols.join(","))}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbols]);

  return (
    <div className="card p-4">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <InfoTip text="Korelasi imbal hasil harian antar aset (−1 sampai +1). +1 = bergerak sangat searah, 0 = tidak berhubungan, −1 = berlawanan. Untuk diversifikasi, pilih aset dengan korelasi rendah/negatif.">
          Matriks Korelasi
        </InfoTip>
        {data?.mock && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            contoh
          </span>
        )}
      </h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Seberapa seiring aset bergerak — untuk menilai diversifikasi.{" "}
        <span className="text-up">Hijau</span> = korelasi rendah/negatif (baik
        untuk diversifikasi), <span className="text-down">merah</span> = bergerak
        searah.
      </p>

      {symbols.length < 2 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tambahkan minimal 2 aset untuk melihat korelasi.
        </p>
      ) : loading && !data ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Menghitung…</p>
      ) : data && data.matrix.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white p-2 dark:bg-slate-900"></th>
                {data.symbols.map((s) => (
                  <th
                    key={s}
                    className="whitespace-nowrap p-2 font-medium text-slate-500 dark:text-slate-400"
                  >
                    {resolve(s).short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.symbols.map((rowSym, i) => (
                <tr key={rowSym}>
                  <th className="sticky left-0 z-10 whitespace-nowrap bg-white p-2 text-left font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {resolve(rowSym).short}
                  </th>
                  {data.matrix[i].map((v, j) => (
                    <td
                      key={j}
                      style={cellStyle(v)}
                      className="p-2 text-center tabular-nums text-slate-800 dark:text-slate-100"
                      title={`${resolve(rowSym).short} ↔ ${resolve(data.symbols[j]).short}: ${v == null ? "—" : v.toFixed(2)}`}
                    >
                      {v == null ? "—" : v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Data tidak cukup untuk menghitung korelasi.
        </p>
      )}

      {data && data.sampleSize > 0 && (
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          Berdasarkan ~{data.sampleSize} hari imbal hasil yang beririsan.
          Edukatif, bukan saran investasi.
        </p>
      )}
    </div>
  );
}
