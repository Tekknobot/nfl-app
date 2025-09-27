// scripts/fetch-nfl-schedule.mjs — BallDon'tLie NFL (free plan)
// Writes: public/nfl-upcoming-3mo.json
// Shape: { "YYYY-MM-DD": [{week,home,away,kickoff,venue?,city?,state?,status?}, ...] }

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Polyfill fetch for Node < 18
if (typeof fetch === "undefined") {
  const nodeFetch = await import("node-fetch");
  globalThis.fetch = nodeFetch.default;
}

const OUT = join(process.cwd(), "public", "nfl-upcoming-3mo.json");
const BDL_KEY = process.env.BDL_API_KEY; // IMPORTANT: set this before running
if (!BDL_KEY) {
  console.error("Missing BDL_API_KEY (BallDon'tLie). Export it before running.");
  process.exit(1);
}

const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const ymdDash = ymd;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const from = new Date();
const to   = addDays(from, 92); // ~3 months

const allDates = [];
for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) allDates.push(ymd(d));

const API = "https://api.balldontlie.io/nfl/v1/games";
// BDL expects: Authorization: YOUR_API_KEY   (no "Bearer")
const HEADERS = { Accept: "application/json", Authorization: BDL_KEY };

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchPage(params) {
  const qs = new URLSearchParams(params);
  const url = `${API}?${qs.toString()}`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`BDL HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

async function fetchDatesChunk(datesChunk) {
  const base = new URLSearchParams();
  for (const d of datesChunk) base.append("dates[]", d);
  base.set("per_page", "100");

  const results = [];
  let cursor = undefined;
  do {
    const params = new URLSearchParams(base);
    if (cursor != null) params.set("cursor", String(cursor));
    const j = await fetchPage(params);
    (j.data || []).forEach(g => results.push(g));
    cursor = j.meta?.next_cursor ?? null;
  } while (cursor != null);
  return results;
}

(async () => {
  try {
    console.log(`BDL window: ${allDates[0]} → ${allDates[allDates.length-1]}`);
    const out = {};
    let total = 0;

    // ~92 days / 20 = about 5 API calls (free tier: 5 req/min)
    for (const datesChunk of chunk(allDates, 20)) {
      const games = await fetchDatesChunk(datesChunk);
      for (const g of games) {
        const d = new Date(g.date);
        const key = ymdDash(d);
        (out[key] ||= []).push({
          week: g.week ?? null,
          home: g.home_team?.abbreviation || g.home_team?.name || null,
          away: g.visitor_team?.abbreviation || g.visitor_team?.name || null,
          kickoff: g.date, // ISO
          venue: g.venue || null,
          city: g.venue_city || g.city || null,
          state: g.venue_state || g.state || null,
          status: g.status || null
        });
        total++;
      }
    }

    await mkdir(join(process.cwd(), "public"), { recursive: true });
    await writeFile(OUT, JSON.stringify(out, null, 2));
    console.log(`Wrote ${OUT} with ${total} games`);
  } catch (err) {
    console.error("BDL fetch failed:", err);
    await mkdir(join(process.cwd(), "public"), { recursive: true });
    await writeFile(OUT, JSON.stringify({}, null, 2)); // valid empty
    process.exitCode = 1;
  }
})();
