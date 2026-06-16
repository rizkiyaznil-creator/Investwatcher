"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";

function timeAgo(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() / 1000 - ts;
  const h = Math.floor(diff / 3600);
  if (h < 1) return "baru saja";
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export default function NewsPanel({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        setMock(!!d.mock);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        📰 Berita terkait
        {mock && (
          <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-xs font-normal text-amber-400">
            contoh
          </span>
        )}
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat berita…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada berita.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n, i) => {
            const isLink = n.url && n.url !== "#";
            const inner = (
              <>
                <p className="text-sm text-gray-200 group-hover:text-brand">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {n.source}
                  {n.publishedAt ? ` · ${timeAgo(n.publishedAt)}` : ""}
                </p>
              </>
            );
            return (
              <li key={i} className="group border-b border-gray-800/60 pb-3 last:border-0 last:pb-0">
                {isLink ? (
                  <a href={n.url} target="_blank" rel="noreferrer">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
