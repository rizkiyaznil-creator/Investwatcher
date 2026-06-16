import type { Quote } from "./types";

export function formatPrice(value: number, currency: string): string {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}`;
}

/** Position of current price within the 52-week range as a 0..100 percentage. */
export function rangePosition(q: Quote): number | null {
  if (q.high52 == null || q.low52 == null || q.high52 <= q.low52) return null;
  const pos = ((q.price - q.low52) / (q.high52 - q.low52)) * 100;
  return Math.max(0, Math.min(100, pos));
}

export function changeColor(value: number): string {
  if (value > 0) return "text-up";
  if (value < 0) return "text-down";
  return "text-gray-400";
}
