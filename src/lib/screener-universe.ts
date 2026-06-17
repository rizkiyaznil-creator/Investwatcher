/**
 * Curated screening universe — large/liquid names, NOT official index membership.
 * Kept bounded so a live scan stays within rate limits and serverless timeouts.
 */

// ~40 large-cap US names across sectors.
export const US_UNIVERSE: string[] = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "V",
  "MA", "UNH", "XOM", "JNJ", "WMT", "PG", "HD", "KO", "PEP", "COST",
  "ORCL", "AMD", "NFLX", "CRM", "BAC", "ABBV", "CVX", "MRK", "PFE", "TMO",
  "ADBE", "DIS", "CSCO", "MCD", "WFC", "INTC", "QCOM", "TXN", "IBM", "NKE",
];

// ~45 liquid IDX names (approximates LQ45).
export const ID_UNIVERSE: string[] = [
  "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "TLKM.JK", "ASII.JK", "UNVR.JK", "ICBP.JK", "INDF.JK", "KLBF.JK",
  "UNTR.JK", "ADRO.JK", "ANTM.JK", "MDKA.JK", "PGAS.JK", "GOTO.JK", "ARTO.JK", "AMRT.JK", "CPIN.JK", "INKP.JK",
  "TPIA.JK", "AKRA.JK", "SMGR.JK", "INCO.JK", "MEDC.JK", "PTBA.JK", "ITMG.JK", "HRUM.JK", "EXCL.JK", "ISAT.JK",
  "TOWR.JK", "MTEL.JK", "BRPT.JK", "BRIS.JK", "BBTN.JK", "MAPI.JK", "MAPA.JK", "ACES.JK", "MNCN.JK", "SCMA.JK",
  "BUKA.JK", "AMMN.JK", "ESSA.JK", "BRMS.JK", "RAJA.JK",
];

export type Market = "all" | "us" | "id";

export function universeFor(market: Market): string[] {
  if (market === "us") return US_UNIVERSE;
  if (market === "id") return ID_UNIVERSE;
  return [...US_UNIVERSE, ...ID_UNIVERSE];
}
