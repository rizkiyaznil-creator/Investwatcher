"use client";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  up: boolean;
}

/** Tiny inline SVG sparkline (no external dependency). */
export default function Sparkline({ data, width = 96, height = 28, up }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="opacity-40">—</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = up ? "#16a34a" : "#dc2626";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
