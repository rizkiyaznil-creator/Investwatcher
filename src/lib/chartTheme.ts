export interface ChartPalette {
  axis: string;
  grid: string;
  border: string;
}

/** Colors for lightweight-charts that adapt to light/dark theme. */
export function chartPalette(resolved: "light" | "dark"): ChartPalette {
  if (resolved === "dark") {
    return {
      axis: "#94a3b8", // slate-400
      grid: "rgba(148,163,184,0.12)",
      border: "rgba(71,85,105,0.6)", // slate-600
    };
  }
  return {
    axis: "#475569", // slate-600
    grid: "rgba(148,163,184,0.22)",
    border: "rgba(148,163,184,0.45)",
  };
}
