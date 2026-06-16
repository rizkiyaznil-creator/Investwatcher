/** Color palette for multi-series comparison charts. */
export const SERIES_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

export function colorAt(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}
