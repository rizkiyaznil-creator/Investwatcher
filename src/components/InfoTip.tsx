"use client";

import type { ReactNode } from "react";

interface Props {
  /** Explanation text shown in the floating bubble. */
  text: string;
  /** The term/label the tip is attached to. */
  children: ReactNode;
  /** Tooltip placement relative to the term. */
  side?: "bottom" | "top";
  /** Horizontal alignment of the bubble (use "right"/"left" near screen edges). */
  align?: "center" | "left" | "right";
}

const ALIGN: Record<NonNullable<Props["align"]>, string> = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
};

/**
 * Inline term with a small "i" marker that reveals a floating explanation.
 * Works on desktop (hover) and on touch/keyboard (the marker is focusable, so
 * tapping it shows the bubble via :focus-within).
 */
export default function InfoTip({
  text,
  children,
  side = "bottom",
  align = "center",
}: Props) {
  return (
    <span className="group relative inline-flex items-center gap-1 align-middle">
      <span>{children}</span>
      <span
        tabIndex={0}
        role="button"
        aria-label="Penjelasan"
        className="inline-flex h-3.5 w-3.5 cursor-help select-none items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold normal-case leading-none text-slate-400 outline-none transition-colors hover:border-brand hover:text-brand focus:border-brand focus:text-brand"
      >
        i
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 w-56 max-w-[80vw] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-600 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${ALIGN[align]} ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
