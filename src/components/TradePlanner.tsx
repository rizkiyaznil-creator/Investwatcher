"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { isIdx, roundToTick, tickSize, LOT_SIZE } from "@/lib/idx";
import InfoTip from "./InfoTip";

function NumField({
  label,
  value,
  onChange,
  step,
  suffix,
  tip,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  step?: number;
  suffix?: string;
  tip?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {tip ? <InfoTip text={tip}>{label}</InfoTip> : label}
      </span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? "" : Number(v));
          }}
          className="w-full bg-transparent py-1.5 text-sm tabular-nums outline-none"
        />
        {suffix && <span className="pl-1 text-xs text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, tone = "neutral", tip }: { label: string; value: string; tone?: "up" | "down" | "neutral"; tip?: string }) {
  const c = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {tip ? <InfoTip text={tip}>{label}</InfoTip> : label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${c}`}>{value}</div>
    </div>
  );
}

export default function TradePlanner({
  symbol,
  currentPrice,
  currency,
}: {
  symbol: string;
  currentPrice?: number;
  currency?: string;
}) {
  const idx = isIdx(symbol);
  const cur = currency ?? (idx ? "IDR" : "USD");

  const [capital, setCapital] = useState<number | "">(idx ? 10_000_000 : 1000);
  const [riskPct, setRiskPct] = useState<number | "">(1);
  const [entry, setEntry] = useState<number | "">("");
  const [stop, setStop] = useState<number | "">("");
  const [target, setTarget] = useState<number | "">("");

  // Prefill from current price once it arrives (and fields are empty).
  useEffect(() => {
    if (currentPrice && entry === "") {
      const e = idx ? roundToTick(currentPrice) : Number(currentPrice.toFixed(2));
      setEntry(e);
      setStop(idx ? roundToTick(currentPrice * 0.98) : Number((currentPrice * 0.98).toFixed(2)));
      setTarget(idx ? roundToTick(currentPrice * 1.04) : Number((currentPrice * 1.04).toFixed(2)));
    }
  }, [currentPrice, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = useMemo(() => {
    const e = typeof entry === "number" ? entry : NaN;
    const s = typeof stop === "number" ? stop : NaN;
    const t = typeof target === "number" ? target : NaN;
    const cap = typeof capital === "number" ? capital : NaN;
    const rp = typeof riskPct === "number" ? riskPct : NaN;
    if (!Number.isFinite(e) || !Number.isFinite(s) || e <= 0) return null;

    const riskPerShare = e - s; // long only
    const rewardPerShare = Number.isFinite(t) ? t - e : NaN;
    const rr = riskPerShare > 0 && Number.isFinite(rewardPerShare) ? rewardPerShare / riskPerShare : NaN;
    const stopPct = (riskPerShare / e) * 100;
    const targetPct = Number.isFinite(rewardPerShare) ? (rewardPerShare / e) * 100 : NaN;

    let lots: number | null = null;
    let shares: number | null = null;
    let cost: number | null = null;
    let maxLoss: number | null = null;
    let profit: number | null = null;
    if (Number.isFinite(cap) && Number.isFinite(rp) && riskPerShare > 0) {
      const riskBudget = cap * (rp / 100);
      const rawShares = riskBudget / riskPerShare;
      lots = Math.max(0, Math.floor(rawShares / LOT_SIZE));
      shares = lots * LOT_SIZE;
      cost = shares * e;
      maxLoss = shares * riskPerShare;
      profit = Number.isFinite(rewardPerShare) ? shares * rewardPerShare : null;
    }

    return { e, s, t, riskPerShare, rewardPerShare, rr, stopPct, targetPct, lots, shares, cost, maxLoss, profit, cap };
  }, [entry, stop, target, capital, riskPct]);

  const warnings: string[] = [];
  if (r) {
    if (r.riskPerShare <= 0) warnings.push("Stop loss harus di bawah harga entry (asumsi posisi beli/long).");
    if (Number.isFinite(r.rewardPerShare) && r.rewardPerShare <= 0) warnings.push("Target harus di atas harga entry.");
    if (r.lots === 0) warnings.push("Ukuran posisi < 1 lot — perbesar modal/risiko, atau perlebar stop.");
    if (r.cost != null && Number.isFinite(r.cap) && r.cost > r.cap) warnings.push("Nilai posisi melebihi modal — butuh margin/lebih banyak dana.");
  }

  const fmt = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "–" : formatPrice(v, cur));

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold">
        🧮{" "}
        <InfoTip text="Rencanakan satu transaksi: tentukan entry, stop loss, dan target, lalu hitung ukuran posisi yang sesuai batas risiko Anda. Asumsi posisi beli (long). Edukatif, bukan saran investasi.">
          Trade Planner &amp; Kalkulator Risiko
        </InfoTip>
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <NumField label="Modal akun" value={capital} onChange={setCapital} suffix={cur} tip="Total dana trading Anda — dasar perhitungan batas risiko." />
        <NumField label="Risiko/transaksi" value={riskPct} onChange={setRiskPct} suffix="%" tip="Porsi modal yang siap Anda rugikan pada satu transaksi. Umumnya 0,5%-2%." />
        <NumField label="Entry" value={entry} onChange={setEntry} suffix={cur} tip={idx ? `Harga beli. Tick IDX saat ini Rp${typeof entry === "number" ? tickSize(entry) : "-"}.` : "Harga beli."} />
        <NumField label="Stop loss" value={stop} onChange={setStop} suffix={cur} tip="Harga keluar bila salah arah — pembatas kerugian." />
        <NumField label="Target" value={target} onChange={setTarget} suffix={cur} tip="Harga ambil untung." />
      </div>

      {r && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label="Risk/Reward"
            value={Number.isFinite(r.rr) ? `1 : ${r.rr.toFixed(2)}` : "–"}
            tone={Number.isFinite(r.rr) ? (r.rr >= 2 ? "up" : r.rr < 1 ? "down" : "neutral") : "neutral"}
            tip="Rasio potensi untung terhadap risiko. Banyak trader mensyaratkan minimal 1:2."
          />
          <Stat label="Jumlah lot" value={r.lots != null ? `${r.lots} lot (${r.shares} lbr)` : "–"} tip={`1 lot = ${LOT_SIZE} lembar (IDX).`} />
          <Stat label="Nilai posisi" value={fmt(r.cost)} tone={r.cost != null && Number.isFinite(r.cap) && r.cost > r.cap ? "down" : "neutral"} />
          <Stat label="Maks rugi" value={fmt(r.maxLoss)} tone="down" tip="Kerugian bila stop loss tersentuh." />
          <Stat label="Potensi untung" value={fmt(r.profit)} tone="up" tip="Keuntungan bila target tercapai." />
          <Stat label="Jarak stop" value={Number.isFinite(r.stopPct) ? `${r.stopPct.toFixed(2)}%` : "–"} tone="down" />
          <Stat label="Jarak target" value={Number.isFinite(r.targetPct) ? `+${r.targetPct.toFixed(2)}%` : "–"} tone="up" />
          <Stat label="Risiko/lembar" value={fmt(r.riskPerShare > 0 ? r.riskPerShare : null)} />
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="text-xs text-amber-700 dark:text-amber-300">⚠️ {w}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        {idx ? "Harga dibulatkan ke fraksi (tick) IDX. " : ""}Belum termasuk biaya broker/pajak. Trading harian berisiko
        tinggi; mayoritas trader ritel merugi. Edukatif, bukan saran investasi.
      </p>
    </div>
  );
}
