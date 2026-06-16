"use client";

import Link from "next/link";
import type { Quote } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCatalog } from "./CatalogContext";
import {
  changeColor,
  formatPercent,
  formatPrice,
  rangePosition,
} from "@/lib/format";
import { useCurrency } from "./CurrencyContext";
import Sparkline from "./Sparkline";
import InfoTip from "./InfoTip";

interface Props {
  symbols: string[];
  quotes: Record<string, Quote>;
  loading: boolean;
  onRemove: (symbol: string) => void;
  /** Persist a new order after drag-and-drop reordering. */
  onReorder: (symbols: string[]) => void;
}

export default function WatchlistTable({
  symbols,
  quotes,
  loading,
  onRemove,
  onReorder,
}: Props) {
  const sensors = useSensors(
    // A few px of movement starts a drag, so a plain click still opens detail.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // On touch: press-and-hold briefly, then drag (lets normal scroll work).
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = symbols.indexOf(String(active.id));
    const newIndex = symbols.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(symbols, oldIndex, newIndex));
  }

  if (symbols.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">
        Watchlist kosong. Klik <span className="text-brand">“+ Tambah aset”</span>{" "}
        untuk mulai memantau.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 font-medium">Aset</th>
                <th className="px-4 py-3 text-right font-medium">Harga</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="inline-flex">
                    <InfoTip text="Perubahan harga dibanding penutupan hari perdagangan sebelumnya (persentase harian).">
                      Perubahan
                    </InfoTip>
                  </span>
                </th>
                <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">
                  <span className="inline-flex">
                    <InfoTip text="Grafik mini dari 30 harga terakhir untuk melihat arah pergerakan secara sekilas.">
                      Tren 30 titik
                    </InfoTip>
                  </span>
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  <InfoTip
                    align="right"
                    text="Posisi harga sekarang di antara terendah (L) dan tertinggi (H) selama 52 minggu. 0% = paling murah, 100% = paling mahal dalam setahun."
                  >
                    Posisi 52 minggu
                  </InfoTip>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <SortableContext items={symbols} strategy={verticalListSortingStrategy}>
              <tbody>
                {symbols.map((symbol) => (
                  <SortableRow
                    key={symbol}
                    symbol={symbol}
                    quote={quotes[symbol]}
                    loading={loading}
                    onRemove={onRemove}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400">
        Tahan ikon ⠿ lalu geser untuk mengubah urutan aset.
      </p>
    </div>
  );
}

function SortableRow({
  symbol,
  quote,
  loading,
  onRemove,
}: {
  symbol: string;
  quote: Quote | undefined;
  loading: boolean;
  onRemove: (symbol: string) => void;
}) {
  const { resolve } = useCatalog();
  const { convert } = useCurrency();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: symbol });

  const asset = resolve(symbol);
  const q = quote;
  const up = (q?.changePercent ?? 0) >= 0;
  const pos = q ? rangePosition(q) : null;
  const disp = q ? convert(q.price, q.currency) : null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-200 last:border-0 ${
        isDragging
          ? "relative z-10 bg-white shadow-lg"
          : "hover:bg-slate-50"
      }`}
    >
      <td className="px-2 py-3 align-middle">
        <button
          {...attributes}
          {...listeners}
          aria-label="Seret untuk mengurutkan"
          title="Seret untuk mengurutkan"
          className="flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/asset/${encodeURIComponent(symbol)}`}
          className="flex items-center gap-2"
        >
          <span className="text-lg">{asset.icon ?? "•"}</span>
          <span>
            <span className="block font-medium text-slate-800">{asset.short}</span>
            <span className="block text-xs text-slate-500">{asset.name}</span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {disp ? (
          formatPrice(disp.value, disp.currency)
        ) : loading ? (
          <span className="text-slate-400">…</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums ${q ? changeColor(q.changePercent) : ""}`}
      >
        {q ? formatPercent(q.changePercent) : "—"}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex justify-center">
          {q?.spark ? (
            <Sparkline data={q.spark} up={up} />
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        {pos != null ? (
          <div className="w-40">
            <div className="relative h-1.5 rounded-full bg-slate-200">
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-brand"
                style={{ left: `${pos}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>L</span>
              <span>{pos.toFixed(0)}%</span>
              <span>H</span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onRemove(symbol)}
          title="Hapus dari watchlist"
          className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-down"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
      <circle cx="3" cy="3" r="1.4" />
      <circle cx="9" cy="3" r="1.4" />
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="9" cy="8" r="1.4" />
      <circle cx="3" cy="13" r="1.4" />
      <circle cx="9" cy="13" r="1.4" />
    </svg>
  );
}
