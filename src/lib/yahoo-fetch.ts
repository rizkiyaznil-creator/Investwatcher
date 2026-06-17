/**
 * Shared Yahoo `quoteSummary` client with crumb + cookie auth.
 *
 * Yahoo now rejects unauthenticated quoteSummary requests with HTTP 401
 * ("Invalid Crumb"). The flow is: fetch a cookie, exchange it for a crumb,
 * then send both on every quoteSummary call. The chart (v8) endpoints used for
 * prices/history do NOT need this. Credentials are cached and shared across the
 * many parallel calls the screener makes.
 */

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface Cred {
  cookie: string;
  crumb: string;
  ts: number;
}
const TTL = 30 * 60 * 1000; // 30 min
let cached: Cred | null = null;
let inflight: Promise<Cred | null> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function cookieHeaderFrom(res: Response): string {
  // Prefer getSetCookie() (array) when available; fall back to the combined header.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyHeaders = res.headers as any;
  let cookies: string[] = [];
  if (typeof anyHeaders.getSetCookie === "function") {
    cookies = anyHeaders.getSetCookie();
  }
  if (cookies.length === 0) {
    const sc = res.headers.get("set-cookie");
    if (sc) cookies = [sc];
  }
  // Keep only name=value (drop attributes after the first ';').
  return cookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}

async function obtainCredentials(): Promise<Cred | null> {
  for (const seed of ["https://fc.yahoo.com/", "https://finance.yahoo.com/"]) {
    try {
      const res = await fetchWithTimeout(seed, { headers: { "User-Agent": UA } }, 8000);
      const cookie = cookieHeaderFrom(res);
      if (!cookie) continue;
      for (const host of HOSTS) {
        try {
          const cr = await fetchWithTimeout(
            `${host}/v1/test/getcrumb`,
            { headers: { "User-Agent": UA, Accept: "text/plain", Cookie: cookie } },
            8000,
          );
          if (!cr.ok) continue;
          const crumb = (await cr.text()).trim();
          if (crumb && !crumb.includes("<") && crumb.length < 64) {
            return { cookie, crumb, ts: Date.now() };
          }
        } catch {
          // next host
        }
      }
    } catch {
      // next seed
    }
  }
  return null;
}

async function getCredentials(): Promise<Cred | null> {
  if (cached && Date.now() - cached.ts < TTL) return cached;
  if (!inflight) {
    inflight = obtainCredentials()
      .then((c) => {
        if (c) cached = c;
        return c;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Fetch one symbol's quoteSummary result object, or null on failure.
 * Sends crumb + cookie; retries once without auth as a last resort.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function yahooQuoteSummary(
  symbol: string,
  modules: string,
  revalidate: number,
): Promise<any | null> {
  const cred = await getCredentials();

  for (const host of HOSTS) {
    try {
      const crumbParam = cred?.crumb ? `&crumb=${encodeURIComponent(cred.crumb)}` : "";
      const url = `${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}${crumbParam}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          ...(cred?.cookie ? { Cookie: cred.cookie } : {}),
        },
        next: { revalidate },
      });
      // A 401 means our crumb went stale — drop it so the next call re-auths.
      if (res.status === 401 || res.status === 403) {
        cached = null;
        continue;
      }
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (result) return result;
    } catch {
      // next host
    }
  }
  return null;
}
