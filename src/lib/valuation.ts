import { getAsset } from "./assets";
import { yahooQuoteSummary } from "./yahoo-fetch";

/**
 * Peer groups built from the static catalog. Only same-industry sets of >=3
 * names are defined so "vs sejenis" stays honest. Symbols outside any group
 * simply get no relative valuation.
 */
interface PeerGroup {
  id: string;
  label: string;
  members: string[];
}
const PEER_GROUPS: PeerGroup[] = [
  { id: "id-banks", label: "Bank besar Indonesia", members: ["BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK"] },
  {
    id: "us-bigtech",
    label: "Teknologi besar AS",
    members: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "AMD", "NFLX"],
  },
  { id: "id-consumer", label: "Konsumer Indonesia", members: ["UNVR.JK", "ICBP.JK", "KLBF.JK"] },
  {
    id: "id-resources",
    label: "Tambang & energi Indonesia",
    members: ["ANTM.JK", "ADRO.JK", "MDKA.JK", "UNTR.JK", "PGAS.JK"],
  },
];

function groupFor(symbol: string): PeerGroup | undefined {
  return PEER_GROUPS.find((g) => g.members.includes(symbol));
}

/** Cheap guard so callers can skip work for assets without a peer group. */
export function hasPeerGroup(symbol: string): boolean {
  return !!groupFor(symbol);
}

export interface PeerSnapshot {
  symbol: string;
  short: string;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  isSelf?: boolean;
}

export interface RelativeValuation {
  available: boolean;
  symbol: string;
  groupLabel?: string;
  mock?: boolean;
  reason?: string;
  self?: PeerSnapshot;
  peers: PeerSnapshot[]; // peers only (excludes self)
  peerMedianPE?: number;
  peerMedianPB?: number;
  pePremiumPct?: number; // (self/median - 1) * 100
  pbPremiumPct?: number;
  /** "lebih mahal" | "lebih murah" | "setara" | undefined */
  verdict?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function raw(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

async function fetchSnapshot(symbol: string): Promise<PeerSnapshot | null> {
  const modules = "summaryDetail,defaultKeyStatistics";
  try {
    const r = await yahooQuoteSummary(symbol, modules, 21600);
    if (!r) return null;
    const sd = r.summaryDetail ?? {};
    const ks = r.defaultKeyStatistics ?? {};
    return {
      symbol,
      short: getAsset(symbol)?.short ?? symbol,
      trailingPE: raw(sd.trailingPE),
      forwardPE: raw(sd.forwardPE) ?? raw(ks.forwardPE),
      priceToBook: raw(ks.priceToBook),
    };
  } catch {
    return null;
  }
}

function median(xs: number[]): number | undefined {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (v.length === 0) return undefined;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function verdictFrom(premiumPct: number | undefined): string | undefined {
  if (premiumPct == null) return undefined;
  if (premiumPct > 15) return "lebih mahal";
  if (premiumPct < -15) return "lebih murah";
  return "setara";
}

function compute(symbol: string, groupLabel: string, snaps: PeerSnapshot[], mock?: boolean): RelativeValuation {
  const self = snaps.find((s) => s.symbol === symbol);
  const peers = snaps.filter((s) => s.symbol !== symbol);
  if (self) self.isSelf = true;

  const peerMedianPE = median(peers.map((p) => p.trailingPE ?? NaN));
  const peerMedianPB = median(peers.map((p) => p.priceToBook ?? NaN));

  const pePremiumPct =
    self?.trailingPE && self.trailingPE > 0 && peerMedianPE
      ? (self.trailingPE / peerMedianPE - 1) * 100
      : undefined;
  const pbPremiumPct =
    self?.priceToBook && self.priceToBook > 0 && peerMedianPB
      ? (self.priceToBook / peerMedianPB - 1) * 100
      : undefined;

  // Prefer P/E verdict; fall back to P/B when P/E is unavailable (e.g. loss-makers).
  const verdict = verdictFrom(pePremiumPct ?? pbPremiumPct);

  return {
    available: true,
    symbol,
    groupLabel,
    mock,
    self,
    peers,
    peerMedianPE,
    peerMedianPB,
    pePremiumPct,
    pbPremiumPct,
    verdict,
  };
}

/** Relative valuation of a stock vs its catalog peer group. Mock on failure. */
export async function getRelativeValuation(symbol: string): Promise<RelativeValuation> {
  const group = groupFor(symbol);
  if (!group) {
    return {
      available: false,
      symbol,
      reason: "Belum ada grup pembanding sejenis untuk aset ini.",
      peers: [],
    };
  }

  const snaps = await Promise.all(group.members.map((m) => fetchSnapshot(m)));
  const ok = snaps.filter((s): s is PeerSnapshot => s != null);
  const hasAnyPE = ok.some((s) => (s.trailingPE ?? 0) > 0 || (s.priceToBook ?? 0) > 0);
  if (ok.length >= 2 && hasAnyPE) {
    return compute(symbol, group.label, ok);
  }

  // Live unavailable (e.g. sandbox egress) → deterministic mock.
  return mockValuation(symbol, group);
}

/** Deterministic mock valuation seeded by symbol — for offline/sandbox use. */
export function mockValuation(symbol: string, group = groupFor(symbol)): RelativeValuation {
  if (!group) return { available: false, symbol, reason: "Tidak ada grup pembanding.", peers: [] };
  const snaps: PeerSnapshot[] = group.members.map((m) => {
    let seed = 0;
    for (let i = 0; i < m.length; i++) seed = (seed * 31 + m.charCodeAt(i)) >>> 0;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    return {
      symbol: m,
      short: getAsset(m)?.short ?? m,
      trailingPE: 8 + rng() * 22,
      forwardPE: 7 + rng() * 18,
      priceToBook: 0.8 + rng() * 4,
    };
  });
  return compute(symbol, group.label, snaps, true);
}

/** Compact one-line(s) summary for AI evidence. */
export function summarizeValuationForAI(rv: RelativeValuation): string {
  if (!rv.available || !rv.self) return "Tidak tersedia.";
  const f = (n: number | undefined) => (n == null ? "n/a" : n.toFixed(1));
  const prem = (p: number | undefined) => (p == null ? "" : ` (${p >= 0 ? "+" : ""}${p.toFixed(0)}% vs median)`);
  const peerList = rv.peers
    .map((p) => `${p.short} ${f(p.trailingPE)}`)
    .join(", ");
  const lines = [
    `Grup pembanding: ${rv.groupLabel}.`,
    `P/E ${rv.self.short} ${f(rv.self.trailingPE)} vs median peer ${f(rv.peerMedianPE)}${prem(rv.pePremiumPct)}.`,
    rv.self.priceToBook != null
      ? `P/B ${f(rv.self.priceToBook)} vs median ${f(rv.peerMedianPB)}${prem(rv.pbPremiumPct)}.`
      : null,
    rv.verdict ? `Kesimpulan: valuasi ${rv.verdict} dibanding sejenis.` : null,
    `Peer P/E: ${peerList}.`,
    "Catatan: premium valuasi bisa wajar bila kualitas/pertumbuhan lebih unggul; diskon bisa mencerminkan risiko.",
  ].filter(Boolean);
  return lines.join(" ") + (rv.mock ? " (CATATAN: angka contoh/mock.)" : "");
}
