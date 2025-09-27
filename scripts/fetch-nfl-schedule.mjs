// scripts/fetch-nfl-schedule.mjs — resilient for Vercel builds (BDL free)
// Writes: public/nfl-upcoming-3mo.json
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

// Polyfill fetch for Node <18
if (typeof fetch === "undefined") {
  const nodeFetch = await import("node-fetch");
  globalThis.fetch = nodeFetch.default;
}

const OUT = join(process.cwd(), "public", "nfl-upcoming-3mo.json");
const KEY = process.env.BDL_API_KEY?.trim() || "";
const API = "https://api.balldontlie.io/nfl/v1/games";
const HEADERS = KEY ? { Accept: "application/json", Authorization: KEY } : { Accept: "application/json" };

const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

const start = new Date();
const end = addDays(start, 92);

// chunk helper
function chunk(arr, size){ const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }

async function fetchPage(params) {
  const url = `${API}?${params.toString()}`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    throw new Error(`BDL HTTP ${r.status} ${t}`);
  }
  return r.json();
}

async function fetchDates(dates) {
  const base = new URLSearchParams();
  dates.forEach(d => base.append("dates[]", d));
  base.set("per_page", "100");

  const out = [];
  let cursor;
  let tries = 0;
  do {
    const p = new URLSearchParams(base);
    if (cursor != null) p.set("cursor", String(cursor));
    try {
      const j = await fetchPage(p);
      (j.data || []).forEach(g => out.push(g));
      cursor = j.meta?.next_cursor ?? null;
      tries = 0; // reset on success
    } catch (e) {
      // Soft-handle rate limit/auth; back off once, then give up for this chunk
      if ((`${e}`).includes("429") && tries < 1) {
        await new Promise(r => setTimeout(r, 1500)); // brief backoff
        tries++;
        continue;
      }
      throw e;
    }
  } while (cursor != null);
  return out;
}

function normalize(g) {
  const d = new Date(g.date);
  const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  return {
    key,
    game: {
      week: g.week ?? null,
      home: g.home_team?.abbreviation || g.home_team?.name || null,
      away: g.visitor_team?.abbreviation || g.visitor_team?.name || null,
      kickoff: g.date,
      venue: g.venue || null,
      city: g.venue_city || g.city || null,
      state: g.venue_state || g.state || null,
      status: g.status || null
    }
  };
}

(async () => {
  let out = {};
  try {
    const allDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) allDates.push(ymd(d));

    if (!KEY) {
      console.warn("[prebuild] BDL_API_KEY missing. Will not fetch; keeping existing JSON or writing sample.");
      // Try to keep existing file if any
      try {
        const existing = await readFile(OUT, "utf-8");
        await mkdir(join(process.cwd(), "public"), { recursive: true });
        await writeFile(OUT, existing);
        console.log(`[prebuild] Kept existing ${OUT}`);
        process.exit(0);
      } catch {
        // Write a tiny sample
        const sampleDate = ymd(addDays(new Date(), 7));
        out[sampleDate] = [{ week: 1, home: "NYJ", away: "BUF", kickoff: new Date().toISOString() }];
        await mkdir(join(process.cwd(), "public"), { recursive: true });
        await writeFile(OUT, JSON.stringify(out, null, 2));
        console.log(`[prebuild] Wrote sample ${OUT}`);
        process.exit(0);
      }
    }

    console.log(`[prebuild] BDL fetch window: ${allDates[0]} → ${allDates[allDates.length-1]}`);
    let total = 0;
    for (const datesChunk of chunk(allDates, 20)) {
      const games = await fetchDates(datesChunk);
      for (const g of games) {
        const { key, game } = normalize(g);
        (out[key] ||= []).push(game);
        total++;
      }
    }
    await mkdir(join(process.cwd(), "public"), { recursive: true });
    await writeFile(OUT, JSON.stringify(out, null, 2));
    console.log(`[prebuild] Wrote ${OUT} with ${total} games`);
    process.exit(0);
  } catch (e) {
    console.warn(`[prebuild] BDL fetch failed: ${e}`);
    // Do not fail the build: keep existing file if present, else write empty object
    try {
      const existing = await readFile(OUT, "utf-8");
      await mkdir(join(process.cwd(), "public"), { recursive: true });
      await writeFile(OUT, existing);
      console.log(`[prebuild] Kept existing ${OUT} after error`);
    } catch {
      await mkdir(join(process.cwd(), "public"), { recursive: true });
      await writeFile(OUT, JSON.stringify({}, null, 2));
      console.log(`[prebuild] Wrote empty ${OUT} after error`);
    }
    process.exit(0);
  }
})();
