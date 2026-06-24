"use client";

import { useRef, useState } from "react";
import type { Holding, Transaction } from "@/hooks/usePortfolio";

interface PortfolioData {
  holdings: Holding[];
  transactions: Transaction[];
}

interface Props {
  holdings: Holding[];
  transactions: Transaction[];
  /** Import data (holdings + transactions), merging into or replacing current. */
  onImport: (data: PortfolioData, mode: "merge" | "replace") => void;
}

function parsePayload(text: string): PortfolioData | null {
  try {
    const obj = JSON.parse(text);
    // Accept v1 (array of holdings or {holdings}) and v2 ({holdings, transactions}).
    const holdingsRaw = Array.isArray(obj) ? obj : obj?.holdings;
    const holdings: Holding[] = (Array.isArray(holdingsRaw) ? holdingsRaw : [])
      .filter((h) => h && typeof h.symbol === "string" && Number(h.shares) > 0 && Number(h.avgPrice) > 0)
      .map((h) => ({ symbol: h.symbol, shares: Number(h.shares), avgPrice: Number(h.avgPrice) }));
    const txRaw = obj?.transactions;
    const transactions: Transaction[] = (Array.isArray(txRaw) ? txRaw : [])
      .filter((t) => t && typeof t.symbol === "string" && Number(t.shares) > 0 && (t.type === "buy" || t.type === "sell"))
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : Math.random().toString(36).slice(2),
        symbol: t.symbol,
        type: t.type,
        shares: Number(t.shares),
        price: Number(t.price) || 0,
        date: typeof t.date === "string" ? t.date : new Date().toISOString().slice(0, 10),
        createdAt: Number(t.createdAt) || Date.now(),
      }));
    if (holdings.length === 0 && transactions.length === 0) return null;
    return { holdings, transactions };
  } catch {
    return null;
  }
}

export default function PortfolioTransfer({ holdings, transactions, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportPayload = () =>
    JSON.stringify(
      {
        app: "investwatcher",
        type: "portfolio",
        version: 2,
        exportedAt: new Date().toISOString(),
        holdings,
        transactions,
      },
      null,
      2,
    );

  const download = () => {
    const blob = new Blob([exportPayload()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investwatcher-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportPayload());
      setMsg({ kind: "ok", text: "Tersalin ke clipboard." });
    } catch {
      setText(exportPayload());
      setMsg({ kind: "ok", text: "Clipboard tak tersedia — teks ditaruh di kotak impor, salin dari sana." });
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => setText(t));
  };

  const doImport = (replace: boolean) => {
    const data = parsePayload(text);
    if (!data) {
      setMsg({ kind: "err", text: "Teks tidak valid. Pastikan menempel JSON hasil ekspor." });
      return;
    }
    onImport(data, replace ? "replace" : "merge");
    setMsg({
      kind: "ok",
      text: `${replace ? "Mengganti" : "Menggabung"} ${data.holdings.length} posisi & ${data.transactions.length} transaksi berhasil.`,
    });
    setText("");
  };

  return (
    <div className="card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        <span>🔄 Backup / Pindah perangkat (Ekspor &amp; Impor)</span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Portofolio &amp; riwayat tersimpan lokal di tiap perangkat. Untuk memindahkannya: <strong>Ekspor</strong> di
            perangkat ini, lalu <strong>Impor</strong> di perangkat lain. Data tetap di perangkat Anda (tidak ke server).
          </p>

          {/* Export */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Ekspor ({holdings.length} posisi · {transactions.length} transaksi)
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <button onClick={download} disabled={holdings.length === 0 && transactions.length === 0} className="btn-ghost text-sm">⬇️ Unduh file</button>
              <button onClick={copy} disabled={holdings.length === 0 && transactions.length === 0} className="btn-ghost text-sm">📋 Salin JSON</button>
            </div>
          </div>

          {/* Import */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Impor (posisi + riwayat)</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tempel JSON di sini, atau pilih file…"
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">📂 Pilih file</button>
              <button onClick={() => doImport(false)} disabled={!text.trim()} className="btn-ghost text-sm">➕ Impor (gabung)</button>
              <button onClick={() => doImport(true)} disabled={!text.trim()} className="btn-primary text-sm">♻️ Impor (ganti semua)</button>
            </div>
          </div>

          {msg && (
            <p className={`text-xs ${msg.kind === "ok" ? "text-up" : "text-down"}`}>
              {msg.kind === "ok" ? "✓ " : "⚠️ "}
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
