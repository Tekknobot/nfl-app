import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Card, CardContent, Chip, Stack, Typography, Drawer, Divider,
  List, ListItem, ListItemText, IconButton, Button, CircularProgress,
  useMediaQuery, LinearProgress, ListItemButton, Tooltip, Avatar
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import TodayIcon from "@mui/icons-material/Today";
import { useTheme } from "@mui/material/styles";
import InfoPanelNFL from "./InfoPanelNFL";
import SnapFactPanel from "./SnapFactPanel";

/* ---------- UI helpers ---------- */
const TEAM_COLORS = {
  ARI:"#97233F", ATL:"#A71930", BAL:"#241773", BUF:"#00338D", CAR:"#0085CA",
  CHI:"#0B162A", CIN:"#FB4F14", CLE:"#311D00", DAL:"#041E42", DEN:"#FB4F14",
  DET:"#0076B6", GB:"#203731", HOU:"#03202F", IND:"#002C5F", JAX:"#9F792C",
  KC:"#E31837", LV:"#000000", LAC:"#0080C6", LAR:"#003594", MIA:"#008E97",
  MIN:"#4F2683", NE:"#002244", NO:"#D3BC8D", NYG:"#0B2265", NYJ:"#125740",
  PHI:"#004C54", PIT:"#101820", SF:"#AA0000", SEA:"#002244", TB:"#D50A0A",
  TEN:"#0C2340", WSH:"#5A1414"
};


const dayName = d => d.toLocaleDateString(undefined,{weekday:"short"});
const monthName = d => d.toLocaleDateString(undefined,{month:"long"});
const fmtTime = iso => new Date(iso).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
const pad = n => String(n).padStart(2,'0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addWeeks(d,n){ return addDays(d, n*7); }
function startOfWeek(d){
  const x = new Date(d);
  const dow = x.getDay(); // Sunday=0
  x.setDate(x.getDate() - dow);
  x.setHours(0,0,0,0);
  return x;
}

/* ---------- BallDon’tLie client (free-plan friendly) ---------- */
const BDL_API = "https://api.balldontlie.io/nfl/v1";
// REACT_APP_BDL_KEY must be set in .env (client). Header is literally Authorization: YOUR_KEY (no "Bearer").
const bdlHeaders = () => {
  const key = process.env.REACT_APP_BDL_KEY?.trim();
  return key ? { Accept: "application/json", Authorization: key } : { Accept: "application/json" };
};

// Cache for /teams and per-team forms.
let TEAMS_MAP_PROMISE = null; // Promise<Map<abbrev, id>>
const teamFormCache = new Map(); // `${teamId}:${season}` -> {ppg,oppg}

/** Fetch games for a specific local date from BDL and map to your schedule shape. */
async function fetchGamesForDateBDL(dateObj) {
  const headers = bdlHeaders();
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2,"0");
  const d = String(dateObj.getDate()).padStart(2,"0");
  const dateISO = `${y}-${m}-${d}`;

  const u = new URL(`${BDL_API}/games`);
  u.searchParams.append("dates[]", dateISO);
  u.searchParams.set("per_page", "100");

  const r = await fetch(u, { headers });
  if (!r.ok) return [];
  const j = await r.json();
  const list = Array.isArray(j?.data) ? j.data : [];

  // Map API fields → your schedule item fields
  return list.map(g => {
    // kickoff: use API date if present, else build a local date
    const kickoff = g?.date ? new Date(g.date).toISOString()
                            : new Date(y, Number(m)-1, Number(d), 13, 0, 0).toISOString();

    // team abbrs
    const home = canonAbbr(g?.home_team?.abbreviation || g?.home || "");
    const away = canonAbbr(g?.visitor_team?.abbreviation || g?.away || "");

    // status/score (tolerant)
    const status = g?.status || "";
    const homeScore = Number.isFinite(Number(g?.home_team_score)) ? Number(g.home_team_score)
                      : Number.isFinite(Number(g?.home_score))      ? Number(g.home_score)
                      : null;
    const awayScore = Number.isFinite(Number(g?.visitor_team_score)) ? Number(g.visitor_team_score)
                      : Number.isFinite(Number(g?.away_score))         ? Number(g.away_score)
                      : null;

    return {
      home, away, kickoff,
      week: g?.week ?? g?.game?.week ?? undefined,
      tv: g?.tv ?? undefined,
      status,
      homeScore, awayScore,

      // optional venue/location if present
      venue: g?.venue ?? undefined,
      city: g?.city ?? undefined,
      state: g?.state ?? undefined,
    };
  }).filter(x => x.home && x.away);
}

/** Merge a single day’s games into `data` using your YYYY-MM-DD key. */
function mergeDayIntoData(prev, dateObj, games) {
  const k = dateKey(dateObj);
  const next = { ...(prev || {}) };
  next[k] = Array.isArray(games) ? games.slice().sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff)) : [];
  return next;
}

function gameKey(g) {
  // YYYY-MM-DD from kickoff
  const d = new Date(g.kickoff);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${key}|${(g.away || "").toUpperCase()}@${(g.home || "").toUpperCase()}`;
}

// Canonicalize common NFL abbreviation variants across feeds/APIs
function canonAbbr(x) {
  const k = String(x || "").toUpperCase();
  const map = {
    WAS: "WSH", WFT: "WSH", RED: "WSH",
    JAC: "JAX",
    TAM: "TB",
    NOR: "NO",
    GNB: "GB",
    SFO: "SF",
    ARZ: "ARI",
    SD:  "LAC",
    OAK: "LV",
    STL: "LAR", LA: "LAR",
    NWE: "NE",
    KCC: "KC",
  };
  return map[k] || k;
}

// Verdict for final games: was the model pick correct?
function verdictForGame(g, prob) {
  // final?
  const isFinal =
    /(final|completed|full\s*time|^ft$|ended|complete)/i.test(String(g?.status || "")) ||
    (Number.isFinite(Number(g?.homeScore)) && Number.isFinite(Number(g?.awayScore)));

  if (!isFinal) return null;

  // robust score read
  const hs = scoreNum(g?.homeScore ?? g?.home_score ?? g?.home_points ?? g?.home_final);
  const as = scoreNum(g?.awayScore ?? g?.away_score ?? g?.away_points ?? g?.visitor_score ?? g?.away_final);
  if (hs == null || as == null || hs === as) return { final: true, tie: true };

  const actual = hs > as ? "home" : "away";
  if (!prob || typeof prob.home !== "number" || typeof prob.away !== "number") {
    return { final: true, actual, predicted: null, correct: null, confidence: null };
  }

  const predicted = prob.home >= prob.away ? "home" : "away";
  const confidence = Math.max(prob.home, prob.away); // 0..1
  return { final: true, actual, predicted, correct: predicted === actual, confidence };
}

// Ensure a team exists in the ratings with neutral 0 values
function ensureTeamRating(off, def, abbr) {
  if (!off.has(abbr)) off.set(abbr, 0);
  if (!def.has(abbr)) def.set(abbr, 0);
}

/** Convert American moneyline to implied probability (with vig). */
function impliedProbFromMoneyline(ml) {
  if (ml == null || Number.isNaN(Number(ml))) return null;
  const n = Number(ml);
  if (n > 0) return 100 / (n + 100);
  if (n < 0) return -n / (-n + 100);
  return null;
}

/** ===== Season-wide model (uses ALL completed games this season) ===== */

/** Small numeric helpers */
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---- Finals cache (do NOT cache empty) ----
const _SEASON_FINALS_CACHE = new Map(); // season -> finals[]

async function getSeasonFinals(season, { force = false } = {}) {
  if (!force && _SEASON_FINALS_CACHE.has(season)) return _SEASON_FINALS_CACHE.get(season);

  const teams = await getTeamsMap();
  const finalsMap = new Map();

  const pulls = [];
  for (const [, id] of teams.entries()) {
    pulls.push(
      fetchTeamGamesForSeason(id, season).then(list => {
        for (const g of list || []) {
          if (!isFinalGame(g)) continue;

          const homeAbbr = canonAbbr(g?.home_team?.abbreviation || g.home || "");
          const awayAbbr = canonAbbr(g?.visitor_team?.abbreviation || g.away || "");
          const hs = Number(g?.home_team_score ?? g?.home_score ?? g?.homeScore ?? NaN);
          const vs = Number(g?.visitor_team_score ?? g?.away_score ?? g?.awayScore ?? NaN);
          if (!homeAbbr || !awayAbbr || !Number.isFinite(hs) || !Number.isFinite(vs)) continue;

          finalsMap.set(_seasonGameKey(g), {
            home: homeAbbr,
            away: awayAbbr,
            home_pts: hs,
            away_pts: vs,
            week: Number(g?.week ?? g?.game?.week ?? NaN),
          });
        }
      }).catch(()=>{})
    );
  }
  await Promise.all(pulls);

  const finals = Array.from(finalsMap.values());
  // ⬇️ Only cache if we actually have data
  if (finals.length > 0) _SEASON_FINALS_CACHE.set(season, finals);
  return finals;
}

// ---- Ratings cache (do NOT cache empty) + force refresh ----
const _SEASON_RATINGS_CACHE = new Map(); // season -> { off, def, hfa, sigma, meta }

async function getSeasonRatings(season, { force = false } = {}) {
  if (!force && _SEASON_RATINGS_CACHE.has(season)) return _SEASON_RATINGS_CACHE.get(season);

  const games = await getSeasonFinals(season, { force });
  if (!games.length) {
    // return a neutral object but DO NOT cache it; next call can re-try
    return { off:new Map(), def:new Map(), hfa:2.0, sigma:7.0, meta:{ nGames:0, wMin:null, wMax:null } };
  }

  const weeks = games.map(g => g.week).filter(w => Number.isFinite(w));
  const wMin = weeks.length ? Math.min(...weeks) : null;
  const wMax = weeks.length ? Math.max(...weeks) : null;

  const teamSet = new Set(games.flatMap(g => [g.home, g.away]));
  const off = new Map(), def = new Map();
  for (const t of teamSet) { off.set(t, 0); def.set(t, 0); }

  let hfa = games.reduce((s,g)=> s + (g.home_pts - g.away_pts), 0) / games.length;
  const weekWeight = (w) => (Number.isFinite(w) && wMax != null) ? Math.pow(0.85, (wMax - w)) : 1;

  const LR = 0.015, EPOCHS = 10;
  for (let epoch=0; epoch<EPOCHS; epoch++) {
    for (const g of games) {
      const w = weekWeight(g.week);
      const oh = off.get(g.home), dh = def.get(g.home);
      const oa = off.get(g.away), da = def.get(g.away);

      const predH = oh - da + hfa;
      const predA = oa - dh;

      const errH = g.home_pts - predH;
      const errA = g.away_pts - predA;

      off.set(g.home, oh + LR * w * errH);
      def.set(g.away, da - LR * w * errH);
      off.set(g.away, oa + LR * w * errA);
      def.set(g.home, dh - LR * w * errA);
    }
    // center
    const meanOff = Array.from(off.values()).reduce((a,b)=>a+b,0)/off.size;
    const meanDef = Array.from(def.values()).reduce((a,b)=>a+b,0)/def.size;
    for (const t of off.keys()) off.set(t, off.get(t) - meanOff);
    for (const t of def.keys()) def.set(t, def.get(t) - meanDef);

    // tweak HFA from margin errors
    let hErr=0, wSum=0;
    for (const g of games) {
      const w = weekWeight(g.week);
      const predM = (off.get(g.home)-def.get(g.away)) - (off.get(g.away)-def.get(g.home)) + hfa;
      hErr += w * ((g.home_pts - g.away_pts) - predM);
      wSum += w;
    }
    if (wSum>0) hfa += (LR*0.25) * (hErr / wSum);
  }

  // sigma from RMSE
  let sse=0;
  for (const g of games) {
    const predM = (off.get(g.home)-def.get(g.away)) - (off.get(g.away)-def.get(g.home)) + hfa;
    const err = (g.home_pts - g.away_pts) - predM;
    sse += err*err;
  }
  const n = games.length;
  const rmse = n ? Math.sqrt(sse/n) : 7.0;
  const sigma = Math.max(5.0, Math.min(12.0, rmse));

  const out = { off, def, hfa, sigma, meta:{ nGames:n, wMin, wMax } };
  // ⬇️ Cache only if we have non-empty data
  _SEASON_RATINGS_CACHE.set(season, out);
  return out;
}


function _seasonGameKey(g) {
  if (g?.id != null) return `id:${g.id}`;
  const d = new Date(g.date || g.kickoff || g.start_time || 0);
  const y = d.getFullYear(), m = d.getMonth()+1, day = d.getDate();
  const k = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const ha = canonAbbr(g?.home_team?.abbreviation || g.home || "");
  const va = canonAbbr(g?.visitor_team?.abbreviation || g.away || "");
  return `${k}|${va}@${ha}`;
}

/** Predict probability using season ratings (ALL finals this season) */
async function predictSeasonProb({ season, homeAbbr, awayAbbr }) {
  // first try (uses cache)
  let res = await getSeasonRatings(season);
  if ((res?.meta?.nGames ?? 0) === 0) {
    // re-try with force refresh (don’t use stale empty cache)
    res = await getSeasonRatings(season, { force: true });
  }

  const { off, def, hfa, sigma, meta } = res;
  const H = canonAbbr(homeAbbr);
  const A = canonAbbr(awayAbbr);
  ensureTeamRating(off, def, H);
  ensureTeamRating(off, def, A);

  const margin = (off.get(H)-def.get(A)) - (off.get(A)-def.get(H)) + hfa;
  const pHome = 1 / (1 + Math.exp(-margin / (sigma || 7)));

  const wSpan = (meta?.wMin != null && meta?.wMax != null) ? ` W${meta.wMin}–W${meta.wMax}` : "";
  const nPart = meta?.nGames != null ? ` (n=${meta.nGames})` : "";
  const hfaPart = `, HFA=${(hfa ?? 0).toFixed(1)}`;
  const sigmaPart = `, σ=${(sigma ?? 7).toFixed(1)}`;
  return { pHome, note: `Season model: ${season}${wSpan} finals${nPart}${hfaPart}${sigmaPart}` };
}


/** Pro odds fetcher (call with canonAbbr values) */
async function fetchGameMoneylinesBDLPro({ dateISO, homeAbbr, awayAbbr }) {
  const key = process.env.REACT_APP_BDL_KEY?.trim();
  if (!key) return null;
  const headers = { Accept: "application/json", Authorization: key };

  const candidates = [
    { path: "/odds",  params: { date: dateISO, sport: "nfl" } },
    { path: "/games", params: { "dates[]": dateISO, include: "odds", sport: "nfl" } },
  ];
  const buildUrl = (base, path, params) => {
    const u = new URL(`${BDL_API}${path}`);
    Object.entries(params || {}).forEach(([k, v]) => u.searchParams.append(k, v));
    if (!u.searchParams.has("per_page")) u.searchParams.set("per_page", "100");
    return u.toString();
  };

  const same = (a,b) => canonAbbr(a) === canonAbbr(b);

  const readPairFromUnknown = (container) => {
    if (!container || typeof container !== "object") return { home: null, away: null };

    const flatKeys = (side) => [
      `${side}_moneyline`, `${side}_ml`, `${side}_price`,
      side === "home" ? "ml_home" : "ml_away",
      side === "home" ? "moneyline_home" : "moneyline_away",
      side === "home" ? "homePrice" : "awayPrice",
      side === "home" ? "homeMoneyline" : "awayMoneyline",
    ];
    const readFlat = (side) => {
      for (const k of flatKeys(side)) {
        const v = container?.[k];
        if (v != null) return Number(v);
      }
      return null;
    };
    let mlHome = readFlat("home");
    let mlAway = readFlat("away");
    if (mlHome != null && mlAway != null) return { home: mlHome, away: mlAway };

    const tryOutcomes = (obj) => {
      const out = Array.isArray(obj?.outcomes) ? obj.outcomes : Array.isArray(obj) ? obj : [];
      if (!out.length) return { home: null, away: null };
      const pickPrice = (o) => {
        const p = o?.price ?? o?.american ?? o?.moneyline ?? o?.ml ?? o?.odds;
        return p != null ? Number(p) : null;
      };
      const hCand =
        out.find(o => /(home|h)/i.test(String(o.side || o.role || o.selection || ""))) ||
        out.find(o => same(o.team?.abbreviation, container?.home_team?.abbreviation));
      const aCand =
        out.find(o => /(away|a|visitor)/i.test(String(o.side || o.role || o.selection || ""))) ||
        out.find(o => same(o.team?.abbreviation, container?.visitor_team?.abbreviation) ||
                      same(o.team?.abbreviation, container?.away_team?.abbreviation));
      return { home: pickPrice(hCand), away: pickPrice(aCand) };
    };

    const books = container?.books || container?.offers || null;
    if (Array.isArray(books) && books.length) {
      for (const book of books) {
        const markets = book?.markets || book?.lines || book?.offers || null;
        if (!markets) continue;
        const arr = Array.isArray(markets) ? markets : [markets];
        let mlMarket =
          arr.find(m => /moneyline/i.test(m?.key || m?.market || m?.name || m?.type || "")) || arr[0];
        if (!mlMarket) continue;

        let { home, away } = readPairFromUnknown(mlMarket);
        if (home != null && away != null) return { home, away };

        const o = tryOutcomes(mlMarket);
        if (o.home != null && o.away != null) return o;
      }
    }

    const markets = container?.markets || container?.odds || container?.market || null;
    if (markets) {
      const arr = Array.isArray(markets) ? markets : [markets];
      let mlMarket =
        arr.find(m => /moneyline/i.test(m?.key || m?.market || m?.name || m?.type || "")) || arr[0];
      if (mlMarket) {
        let { home, away } = readPairFromUnknown(mlMarket);
        if (home != null && away != null) return { home, away };
        const o = tryOutcomes(mlMarket);
        if (o.home != null && o.away != null) return o;
      }
    }

    const o = tryOutcomes(container);
    if (o.home != null && o.away != null) return o;

    return { home: null, away: null };
  };

  for (const c of candidates) {
    try {
      const r = await fetch(buildUrl(BDL_API, c.path, c.params), { headers });
      if (!r.ok) continue;
      const j = await r.json();
      const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      if (!list.length) continue;

      const row = list.find(item => {
        const h = item?.home_team?.abbreviation ?? item?.homeTeam?.abbreviation ?? item?.home_abbr ?? item?.home;
        const a = item?.visitor_team?.abbreviation ?? item?.away_team?.abbreviation ?? item?.awayTeam?.abbreviation ?? item?.away_abbr ?? item?.away;
        return same(h, homeAbbr) && same(a, awayAbbr);
      });
      if (!row) continue;

      const p1 = readPairFromUnknown(row);
      if (p1.home != null && p1.away != null) return { mlHome: p1.home, mlAway: p1.away };

      const nested = [row?.odds, row?.book, row?.books, row?.markets, row?.offers].flat().filter(Boolean);
      for (const src of (Array.isArray(nested) ? nested : [nested])) {
        const p = readPairFromUnknown(src);
        if (p.home != null && p.away != null) return { mlHome: p.home, mlAway: p.away };
      }
    } catch { /* try next */ }
  }
  return null;
}


/** Returns { home, away, note } using:
 *  - BDL Pro moneylines (de-vigged) if available
 *  - Season-wide model from ALL completed games this season
 *  Blended for robustness (70% market / 30% model).
 */
async function getWinProbabilityForGame(g) {
  const season = new Date(g.kickoff).getFullYear();
  const homeAbbr = canonAbbr(g.home);
  const awayAbbr = canonAbbr(g.away);

  // Season model (always try)
  const seasonRes = await predictSeasonProb({ season, homeAbbr, awayAbbr });
  const pModel = seasonRes?.pHome ?? null;

  // Market odds (Pro)
  const d = new Date(g.kickoff);
  const dateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const pro = await fetchGameMoneylinesBDLPro({ dateISO, homeAbbr, awayAbbr });

  let pMarket = null;
  if (pro?.mlHome != null && pro?.mlAway != null) {
    const pHraw = impliedProbFromMoneyline(pro.mlHome);
    const pAraw = impliedProbFromMoneyline(pro.mlAway);
    const sum = (pHraw ?? 0) + (pAraw ?? 0);
    if (pHraw != null && pAraw != null && sum > 0) {
      pMarket = pHraw / sum; // de-vig normalize
    }
  }

  // Blend
  let pHome, note;
  if (pMarket != null && pModel != null) {
    const ALPHA = 0.70;
    pHome = Math.max(0, Math.min(1, ALPHA * pMarket + (1 - ALPHA) * pModel));
    note = `Blended: Market (70%) + ${seasonRes.note}`;
  } else if (pMarket != null) {
    pHome = pMarket;
    note = `Based on BDL Pro moneylines (de-vigged).`;
  } else if (pModel != null) {
    pHome = pModel;
    note = seasonRes.note;
  } else {
    const HFA = 2.0;
    pHome = 1 / (1 + Math.exp(-HFA / 7));
    note = "Fallback: HFA only";
  }

  return { home: pHome, away: 1 - pHome, note };
}


async function fetchLiveGameBDL({ dateISO, homeAbbr, awayAbbr }) {
  const headers = bdlHeaders();
  const u = new URL(`${BDL_API}/games`);
  u.searchParams.append("dates[]", dateISO);      // YYYY-MM-DD
  u.searchParams.set("per_page", "100");

  const r = await fetch(u, { headers });
  if (!r.ok) return null;
  const j = await r.json();
  const data = Array.isArray(j?.data) ? j.data : [];

  // Find the exact matchup for this date (compare abbreviations)
  const match = data.find(g => {
    const h = canonAbbr(g?.home_team?.abbreviation);
    const v = canonAbbr(g?.visitor_team?.abbreviation);
    return h === canonAbbr(homeAbbr) && v === canonAbbr(awayAbbr);
  });
  if (!match) return null;

  return {
    status: match?.status || null,
    homeScore: Number.isFinite(match?.home_team_score) ? match.home_team_score : null,
    awayScore: Number.isFinite(match?.visitor_team_score) ? match.visitor_team_score : null
  };
}


async function getTeamsMap() {
  if (!TEAMS_MAP_PROMISE) {
    const r = await fetch(`${BDL_API}/teams`, { headers: bdlHeaders() });
    if (!r.ok) throw new Error("Failed to load teams");
    const j = await r.json();
    const map = new Map();
    for (const t of j.data || []) {
      if (t.abbreviation && t.id != null) map.set(t.abbreviation.toUpperCase(), String(t.id));
    }
    TEAMS_MAP_PROMISE = Promise.resolve(map);
  }
  return TEAMS_MAP_PROMISE;
}

async function fetchTeamGamesForSeason(teamId, seasonYear) {
  const out = [];
  let cursor, guard = 0;
  do {
    const p = new URLSearchParams();
    p.append("seasons[]", String(seasonYear));
    p.append("team_ids[]", String(teamId));
    p.set("per_page", "100");
    if (cursor != null) p.set("cursor", String(cursor));
    const r = await fetch(`${BDL_API}/games?${p.toString()}`, { headers: bdlHeaders() });
    if (!r.ok) break;
    const j = await r.json();
    out.push(...(j.data || []));
    cursor = j.meta?.next_cursor ?? null;
    if (++guard > 8) break;
  } while (cursor != null);
  return out;
}

function isFinalGame(g) {
  // tolerate multiple shapes
  const hs =
    g?.home_team_score ?? g?.home_score ?? g?.homeScore ?? null;
  const vs =
    g?.visitor_team_score ?? g?.away_score ?? g?.awayScore ?? null;

  const hasScores = Number.isFinite(Number(hs)) && Number.isFinite(Number(vs));
  const looksFinal = /(final|completed|full\s*time|^ft$|ended|complete)/i
    .test(String(g?.status || ""));
  return hasScores || looksFinal;
}

/** Compute a team’s simple form (PPG/OPPG) from recent finals across season & previous season. */
async function getTeamFormFromPastGames(teamAbbrev, season) {
  const teams = await getTeamsMap();
  const id = teams.get(String(teamAbbrev).toUpperCase());
  if (!id) return { ppg: null, oppg: null };

  const cacheKey = `${id}:${season}`;
  if (teamFormCache.has(cacheKey)) return teamFormCache.get(cacheKey);

  const prevSeason = (Number(season) || new Date().getFullYear()) - 1;
  const [curr, prev] = await Promise.all([
    fetchTeamGamesForSeason(id, season),
    fetchTeamGamesForSeason(id, prevSeason)
  ]);

  const finals = [...curr, ...prev].filter(isFinalGame).slice(-10);
  let pts = 0, opp = 0, n = 0;
  for (const g of finals) {
    const isHome = String(g.home_team?.id) === String(id) || g.home_team?.abbreviation === teamAbbrev;
    const hs = Number(g.home_score ?? NaN);
    const vs = Number(g.visitor_score ?? NaN);
    if (Number.isNaN(hs) || Number.isNaN(vs)) continue;
    const teamPts = isHome ? hs : vs;
    const oppPts  = isHome ? vs : hs;
    pts += teamPts; opp += oppPts; n++;
  }
  const form = { ppg: n ? pts/n : null, oppg: n ? opp/n : null };
  teamFormCache.set(cacheKey, form);
  return form;
}

// Logistic transform: margin (in points) → probability [0..1].
function probFromMargin(margin, scale = 7) {
  return 1 / (1 + Math.exp(-margin / scale));
}

/* ---------- Small subcomponents ---------- */
function DayPill({ d, selected, count, finalCount = 0, allFinal = false, onClick }) {
  const dow = d.toLocaleDateString(undefined,{ weekday:'short' });
  const day = d.getDate();
  const isToday = dateKey(new Date()) === dateKey(d);

  return (
    <Button
      onClick={onClick}
      variant={selected ? "contained" : "outlined"}
      size="large"
      aria-label={`${dow} ${day}, ${count||0} games`}
      sx={{
        borderRadius: 1,
        minWidth: 92,
        height: 80,
        px: 1.1,
        py: 0.75,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        bgcolor: selected ? 'primary.main' : 'background.paper',
        color: selected ? 'primary.contrastText' : 'text.primary',
        borderColor: selected ? 'primary.main' : 'divider',
        boxShadow: selected ? 2 : 0
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.85, lineHeight: 1 }}>
        {dow}{isToday && !selected ? ' •' : ''}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, mt: 0.25 }}>
        {String(day).padStart(2,'0')}
      </Typography>

      {/* Count + Final indicator */}
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.9 }}>
        <Chip
          size="small"
          label={String(count)}
          color={count ? 'secondary' : 'default'}
          variant={selected ? 'filled' : 'outlined'}
          sx={{ height: 20, borderRadius: 0.75, '& .MuiChip-label': { px: .8, fontSize: 11, fontWeight: 700 } }}
        />
        {allFinal ? (
          <Chip
            size="small"
            color="success"
            label="Final"
            sx={{ height: 20, borderRadius: 0.75, '& .MuiChip-label': { px: .8, fontSize: 11, fontWeight: 700 } }}
          />
        ) : (finalCount > 0 ? (
          <Chip
            size="small"
            label={`${finalCount} final`}
            sx={{ height: 20, borderRadius: 0.75, '& .MuiChip-label': { px: .8, fontSize: 11, fontWeight: 700 } }}
          />
        ) : null)}
      </Stack>
    </Button>
  );
}

// Final-state detection with extra fallbacks (keep yours or this identical copy)
function isGameFinal(g) {
  if (!g) return false;
  if (g.is_final === true) return true;
  if (String(g.status_code || "").toLowerCase() === "completed") return true;
  const s = String(g.status || "").toLowerCase();
  return /(final|completed|full\s*time|^ft$|ended|complete)/i.test(s);
}

// Lightweight live/in-progress detector
function isGameLive(g) {
  const s = String(g?.status || "").toLowerCase();
  // cover “in progress”, quarters, halftime, OT, etc.
  return /(in\s*progress|q1|q2|q3|q4|quarter|halftime|ot|overtime|end\s*q[1-4])/i.test(s);
}

// Coerce anything like "27", "27 (OT)" → 27
function scoreNum(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// --- Model/pick helpers (pregame, frozen) ---

/** Turn a probability into a pick + confidence text */
function pickFromProb(prob, homeTeam, awayTeam) {
  if (!prob || typeof prob.home !== "number" || typeof prob.away !== "number") {
    return null;
  }
  const side = prob.home >= prob.away ? "home" : "away";
  const team = side === "home" ? homeTeam : awayTeam;
  const confidence = Math.max(prob.home, prob.away); // 0..1
  return {
    side,                // "home" | "away"
    team,                // team string
    confidence,          // 0..1
    confidencePct: `${(confidence * 100).toFixed(1)}%`
  };
}

/** Prefer the frozen pregame probability; fallback to live prob (if you still compute it) */
function getPreferredProb(selected, pregameProbByKey, liveProb /* your existing `prob` */) {
  if (!selected?.g) return null;
  const k = gameKey(selected.g);
  const frozen = pregameProbByKey[k];
  if (frozen) return { home: frozen.home, away: frozen.away, frozen }; // includes timestamp metadata
  return liveProb || null;
}

// Try many shapes: camel/snake, nested, totals, and combined strings like "27–24"
function extractScores(g) {
  const tryPairs = [
    [g?.homeScore, g?.awayScore],
    [g?.home_score, g?.away_score],
    [g?.home_points, g?.away_points],
    [g?.home_final, g?.away_final],
    [g?.score?.home, g?.score?.away],
    [g?.boxscore?.home_total, g?.boxscore?.away_total],
    [g?.totals?.home, g?.totals?.away],
  ];

  for (const [h, a] of tryPairs) {
    const H = scoreNum(h), A = scoreNum(a);
    if (H !== null && A !== null) {
      // ⬇️ if 0–0 and not final or live, treat as "no score yet"
      if (H === 0 && A === 0 && !isGameFinal(g) && !isGameLive(g)) {
        return { home: null, away: null, have: false };
      }
      return { home: H, away: A, have: true };
    }
  }

  // Combined strings: "27-24", "27 – 24", etc. Assuming away-home order is common; flip if needed
  const combined = g?.final || g?.result || g?.scoreline || g?.score;
  if (typeof combined === "string") {
    const m = combined.match(/(\d+)\s*[–-]\s*(\d+)/); // en dash or hyphen
    if (m) {
      const A = scoreNum(m[1]);
      const H = scoreNum(m[2]);
      if (H !== null && A !== null) {
        if (H === 0 && A === 0 && !isGameFinal(g) && !isGameLive(g)) {
          return { home: null, away: null, have: false };
        }
        return { home: H, away: A, have: true };
      }
    }
  }

  return { home: null, away: null, have: false };
}


function normalizeScheduleKeys(raw) {
  const out = {};
  for (const [k, games] of Object.entries(raw || {})) {
    const [y, m, d] = String(k).split("-").map(Number);
    if (!y || !m || !d) continue;
    const key = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    out[key] = Array.isArray(games) ? games : [];
  }
  return out;
}

function GameRow({ g, onClick }) {
  const { home: homeScore, away: awayScore, have: haveScores } = extractScores(g);
  const isFinal = isGameFinal(g);

  const winner =
    haveScores && homeScore !== awayScore
      ? (homeScore > awayScore ? "home" : "away")
      : null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1,
        ...(isFinal ? { bgcolor: "rgba(76,175,80,0.06)", borderColor: "rgba(76,175,80,0.35)" } : {})
      }}
    >
      <ListItemButton onClick={onClick} sx={{ borderRadius: 1, "&:hover": { bgcolor: "rgba(255,255,255,.06)" } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: TEAM_COLORS[g.home] || "primary.main", color: "primary.contrastText" }}>
            {g.home}
          </Avatar>

          {/* Middle text */}
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,.95)" }}
            >
              {g.away} @ {g.home}
            </Typography>

            {/* Only show kickoff/status when not final */}
            {!isFinal && (
              <Typography variant="caption" sx={{ opacity: .8, display: "block" }}>
                {fmtTime(g.kickoff)}{g.status ? ` · ${g.status}` : ""}
              </Typography>
            )}
          </Box>

          {/* Right side: status on top, score below (stacked) */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0.75,
              flexShrink: 0,
              minWidth: 112
            }}
          >
            {/* Top row: status chip */}
            {isFinal ? (
              <Chip size="small" color="success" label="Final" />
            ) : haveScores ? (
              <Chip size="small" label={g.status || "In Progress"} />
            ) : (
              <Chip size="small" variant="outlined" icon={<SportsFootballIcon fontSize="small" />} label="Details" />
            )}

            {/* Bottom: score block (always render for final; render when we have live scores) */}
            {(isFinal || haveScores) && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  lineHeight: 1.15
                }}
                aria-label={isFinal ? "Final score" : "Live score"}
              >
                <Typography variant="body2" sx={{ fontWeight: winner === "away" ? 800 : 700 }}>
                  {g.away} {awayScore ?? "—"}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: winner === "home" ? 800 : 700, opacity: winner === "home" ? 1 : 0.95 }}>
                  {g.home} {homeScore ?? "—"}
                </Typography>

                {/* Optional tiny caption line for extra state like OT, halftime, etc. */}
                {!isFinal && g.status && (
                  <Typography variant="caption" sx={{ opacity: 0.75, mt: 0.25 }}>
                    {g.status}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

        </Stack>
      </ListItemButton>
    </Card>
  );
}

/* ---------- Main Component ---------- */
export default function AllGamesCalendarNFL(){
  const [data, setData] = useState(null);      // { "YYYY-MM-DD": Game[] }
  const [cursor, setCursor] = useState(()=> startOfWeek(new Date())); // week start
  const [selectedDate, setSelectedDate] = useState(()=> new Date());
  const [selected, setSelected] = useState(null); // { g, d }
  const [liveByKey, setLiveByKey] = useState({});

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const freezeAtFor = (g) => new Date(new Date(g.kickoff).getTime() - ONE_HOUR_MS);
  const now = () => Date.now();

  const [pregameProbByKey, setPregameProbByKey] = useState({}); // gameKey -> { home, away, asOf }
  const freezeTimerRef = useRef(null);
  const liveProbIntervalRef = useRef(null);
  const liveProbStopTimerRef = useRef(null);

  // probability state
  const [prob, setProb] = useState(null);       // { home, away } or null
  const [probLoading, setProbLoading] = useState(false);
  const [probNote, setProbNote] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const stripRef = useRef(null);

  // Load schedule JSON once (safe PUBLIC_URL)
  useEffect(() => {
    let cancelled = false;

    const base =
      typeof process.env.PUBLIC_URL === "string" && process.env.PUBLIC_URL.trim() !== ""
        ? process.env.PUBLIC_URL.replace(/\/+$/, "")
        : ""; // CRA dev/prod safe

    const url = `${base}/nfl-upcoming-3mo.json`;

    (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`schedule fetch failed: ${r.status} ${r.statusText}`);
        const json = await r.json();
        const normalized = normalizeScheduleKeys(json);
        if (!cancelled) setData(normalized);
      } catch (err) {
        console.error("[schedule] fetch error:", err);
        if (!cancelled) setData({}); // avoid spinner forever
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // 🔄 Clear any stale season caches on mount (do this before probs are computed)
  useEffect(() => {
    _SEASON_FINALS_CACHE.clear?.();
    _SEASON_RATINGS_CACHE.clear?.();
  }, []);

  // Week days
  const week = useMemo(()=>{
    const start = startOfWeek(cursor);
    return Array.from({length:7}, (_,i)=> addDays(start,i));
  },[cursor]);

  // helpers (put near your other helpers)
  const sameLocalDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Replace your current gamesFor with this version
  const gamesFor = (d) => {
    if (!data) return [];
    // Consider the local day and its UTC neighbors, then filter to the local day
    const buckets = [
      data[dateKey(d)] || [],
      data[dateKey(addDays(d, -1))] || [],
      data[dateKey(addDays(d, 1))] || []
    ].flat();

    return buckets
      .filter(g => sameLocalDay(new Date(g.kickoff), d))
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  };

  // Auto-select first day with games when week changes
  useEffect(() => {
    const today = new Date();
    const todayKey = dateKey(today);

    // Is today within the current week?
    const inThisWeek = week.some(d => dateKey(d) === todayKey);

    // Prefer today if we're in this week (whether or not there are games today),
    // otherwise prefer the first day with games, else the week's first day.
    let target = inThisWeek ? today : week[0];

    const hasGamesToday = inThisWeek && gamesFor(today).length > 0;
    const firstWithGames = week.find(d => gamesFor(d).length > 0);

    setSelectedDate(target);

    const key = dateKey(target);
    const id = setTimeout(() => {
      const el = stripRef.current?.querySelector?.(`[data-day="${key}"]`);
      if (el) el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }, 50);

    return () => clearTimeout(id);
  }, [week, data]);

  // Prefetch the entire visible week from the API for any missing days (works for past weeks too).
  useEffect(() => {
    let cancelled = false;

    async function hydrateWeek() {
      if (!week?.length) return;

      // Find days missing from `data` (no key or empty array)
      const missing = week.filter(d => {
        const arr = data?.[dateKey(d)];
        return !Array.isArray(arr); // treat undefined as missing
      });

      if (!missing.length) return;

      // Fetch in series to be gentle on rate limits; switch to Promise.all if you prefer parallel.
      for (const day of missing) {
        const games = await fetchGamesForDateBDL(day).catch(() => []);
        if (cancelled) return;
        if (games.length || !(dateKey(day) in (data || {}))) {
          setData(prev => mergeDayIntoData(prev, day, games));
        }
      }
    }

    hydrateWeek();
    return () => { cancelled = true; };
  }, [week]); // intentionally NOT depending on `data` to avoid loops

  // If the selected day is still missing (or empty), fetch it on demand.
  useEffect(() => {
    let cancelled = false;
    async function ensureSelectedDay() {
      if (!selectedDate) return;
      const k = dateKey(selectedDate);
      const have = Array.isArray(data?.[k]);
      if (have) return;
      const games = await fetchGamesForDateBDL(selectedDate).catch(() => []);
      if (!cancelled) setData(prev => mergeDayIntoData(prev, selectedDate, games));
    }
    ensureSelectedDay();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const selectedGames = gamesFor(selectedDate);

  // merge live status/scores (if present) into agenda items
  const mergedGames = useMemo(() => {
    return selectedGames.map(g => {
      const k = gameKey(g);
      const patch = liveByKey[k] || {};
      const out = { ...g };

      if (patch.status) out.status = patch.status;
      if (patch.homeScore != null) out.homeScore = patch.homeScore;
      if (patch.awayScore != null) out.awayScore = patch.awayScore;

      // 🚫 Hide placeholder 0–0 unless the game is final/live
      const finalish = isGameFinal(out) || isGameLive(out);
      if (!finalish) {
        const H = Number(out.homeScore);
        const A = Number(out.awayScore);
        if (Number.isFinite(H) && Number.isFinite(A) && H === 0 && A === 0) {
          delete out.homeScore;
          delete out.awayScore;
        }
      }
      return out;
    });
  }, [selectedGames, liveByKey]);

  // Freeze pregame probability: compute exactly 1 hour before kickoff (or immediately if past that)
  useEffect(() => {
    // cleanup any prior timer when selection changes
    if (freezeTimerRef.current) {
      clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
    if (!selected?.g) return;

    let cancelled = false;
    const k = gameKey(selected.g);
    const freezeAt = freezeAtFor(selected.g).getTime();
    const doFreeze = async () => {
      try {
        const res = await getWinProbabilityForGame(selected.g);
        if (!cancelled && res) {
          setPregameProbByKey(prev => ({
            ...prev,
            [k]: {
              home: res.home,    // you can round here if desired
              away: res.away,
              asOf: new Date().toISOString(),
              // Always show the intended freeze moment: kickoff - 1h
              frozenAt: new Date(freezeAt).toISOString()
            }
          }));
        }
      } catch {}
    };

    if (now() >= freezeAt) {
      // We're already inside/past the freeze window -> compute immediately
      doFreeze();
    } else {
      // Not yet time: schedule a one-shot timer for the freeze moment
      const delay = Math.max(0, freezeAt - now());
      freezeTimerRef.current = setTimeout(doFreeze, delay);
    }

    return () => {
      cancelled = true;
      if (freezeTimerRef.current) {
        clearTimeout(freezeTimerRef.current);
        freezeTimerRef.current = null;
      }
    };
  }, [selected, setPregameProbByKey]);

  // Live status / final score updater for the open game
  useEffect(() => {
    if (!selected?.g) return;

    let cancelled = false;
    let timer = null;

    async function tick() {
      const d = new Date(selected.g.kickoff);
      const dateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const live = await fetchLiveGameBDL({
        dateISO,
        homeAbbr: canonAbbr(selected.g.home),
        awayAbbr: canonAbbr(selected.g.away)
      });
      if (!live || cancelled) return;

      // Push live status/score into the currently selected game object
      setSelected(prev => {
        if (!prev) return prev;
        const g = { ...prev.g };
        if (live.status) g.status = live.status;
        if (live.homeScore != null) g.homeScore = live.homeScore;
        if (live.awayScore != null) g.awayScore = live.awayScore;
        return { ...prev, g };
      });

      // Stop if Final, otherwise poll again
      if (!/final/i.test(live.status || "")) {
        timer = setTimeout(tick, 60_000); // 60s
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selected?.g?.home, selected?.g?.away, selected?.g?.kickoff]);

  // Live status/score for the selected day's list (polls every 60s)
  useEffect(() => {
    if (!selectedDate || !data) return;

    let cancelled = false;
    let timer = null;

    const dateISO = dateKey(selectedDate);
    const todays = (data[dateISO] || []).slice(); // games for selectedDate

    async function refresh() {
      // fetch once per game on this day; merge into liveByKey
      const updates = {};
      for (const g of todays) {
        const live = await fetchLiveGameBDL({
          dateISO,
          homeAbbr: g.home,
          awayAbbr: g.away
        });
        if (live) updates[gameKey(g)] = live;
      }
      if (!cancelled && Object.keys(updates).length) {
        setLiveByKey(prev => ({ ...prev, ...updates }));
      }
      // schedule next tick only if at least one game isn’t final
      const anyNotFinal = Object.values(updates).some(u => !/final/i.test(u.status || ""));
      timer = setTimeout(refresh, anyNotFinal ? 60_000 : 180_000);
    }

    refresh();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [selectedDate, data]);

  // Live (pre-freeze) probability: compute now and refresh periodically until freeze time
  useEffect(() => {
    // clear any prior timers on selection change/unmount
    if (liveProbIntervalRef.current) {
      clearInterval(liveProbIntervalRef.current);
      liveProbIntervalRef.current = null;
    }
    if (liveProbStopTimerRef.current) {
      clearTimeout(liveProbStopTimerRef.current);
      liveProbStopTimerRef.current = null;
    }

    if (!selected?.g) return;

    const k = gameKey(selected.g);
    const freezeAtMs = freezeAtFor(selected.g).getTime();

    // if we're past freeze or already have a frozen value, don't run live updates
    if (Date.now() >= freezeAtMs || pregameProbByKey[k]) return;

    let cancelled = false;

    const fetchProb = async () => {
      setProbLoading(true);
      try {
        const res = await getWinProbabilityForGame(selected.g);
        if (!cancelled) {
          setProb(res ? { home: res.home, away: res.away } : null);
          setProbNote(res?.note || "");
        }
      } catch {
        if (!cancelled) {
          setProb(null);
          setProbNote("Probability unavailable.");
        }
      } finally {
        if (!cancelled) setProbLoading(false);
      }
    };

    // compute immediately
    fetchProb();

    // refresh every 5 minutes until freeze
    const REFRESH_MS = 5 * 60 * 1000;
    liveProbIntervalRef.current = setInterval(fetchProb, REFRESH_MS);

    // stop refreshing exactly at freeze time
    const stopDelay = Math.max(0, freezeAtMs - Date.now());
    liveProbStopTimerRef.current = setTimeout(() => {
      if (liveProbIntervalRef.current) {
        clearInterval(liveProbIntervalRef.current);
        liveProbIntervalRef.current = null;
      }
    }, stopDelay);

    return () => {
      cancelled = true;
      if (liveProbIntervalRef.current) {
        clearInterval(liveProbIntervalRef.current);
        liveProbIntervalRef.current = null;
      }
      if (liveProbStopTimerRef.current) {
        clearTimeout(liveProbStopTimerRef.current);
        liveProbStopTimerRef.current = null;
      }
    };
  }, [selected, pregameProbByKey]);


  /* ---------- Render ---------- */
  const weekLabel = `Week of ${monthName(startOfWeek(cursor))} ${startOfWeek(cursor).getDate()}, ${startOfWeek(cursor).getFullYear()}`;
  const isFinalStatus = (s) => /final/i.test(s || "");

  return (
    <Box sx={{ maxWidth: 720, mx:'auto', px:{ xs:1, sm:2 } }}>
      <InfoPanelNFL />

      <SnapFactPanel />

      {/* Sticky header with week nav */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ mb:1.5, position:'sticky', top:0, zIndex:2, bgcolor:'transparent', pt:.5 }}
      >
        <IconButton onClick={()=> setCursor(addWeeks(cursor,-1))}><ChevronLeftIcon/></IconButton>
        <Typography variant={isMobile ? "h6":"h5"} sx={{ letterSpacing:1, flex:1 }}>
          {weekLabel}
        </Typography>
        <Tooltip title="Jump to current week">
          <IconButton onClick={()=> setCursor(startOfWeek(new Date()))}><TodayIcon/></IconButton>
        </Tooltip>
        <IconButton onClick={()=> setCursor(addWeeks(cursor,1))}><ChevronRightIcon/></IconButton>
      </Stack>

      {/* Horizontal day pills */}
      <Box
        ref={stripRef}
        sx={{
          display:'flex', gap:1, overflowX:'auto', pb:1,
          "&::-webkit-scrollbar": { display:'none' }
        }}
      >
        {week.map((d) => {
          const key = dateKey(d);
          const dayGames = gamesFor(d);

          // merge live patches (status/scores) for the pill counts
          let finals = 0;
          for (const g of dayGames) {
            const patch = liveByKey[gameKey(g)];
            const status = patch?.status ?? g.status;
            if (isFinalStatus(status)) finals++;
          }
          const allFinal = dayGames.length > 0 && finals === dayGames.length;

          const selected = dateKey(selectedDate) === key;
          return (
            <Box key={key} data-day={key} sx={{ flex: '0 0 auto' }}>
              <DayPill
                d={d}
                selected={selected}
                count={dayGames.length}
                finalCount={finals}
                allFinal={allFinal}
                onClick={() => setSelectedDate(d)}
              />
            </Box>
          );
        })}
      </Box>

      {/* Day agenda */}
      <Card variant="outlined" sx={{ borderRadius:1 }}>
        <CardContent sx={{ p:1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:700, mb:1 }}>
            {selectedDate.toLocaleDateString(undefined,{ weekday:'long', month:'short', day:'numeric' })}
          </Typography>

          {data === null ? (
            <Stack alignItems="center" sx={{ py:3 }}><CircularProgress size={22} /></Stack>
          ) : mergedGames.length ? (
            <Stack spacing={1}>
              {mergedGames.map((g, i)=>(
                <GameRow key={i} g={g} onClick={()=> setSelected({ g, d: selectedDate })} />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ opacity:0.7 }}>No games today.</Typography>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      <Drawer anchor="right" open={!!selected} onClose={()=> setSelected(null)}>
        <Box sx={{ width: 360, p:2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
            <Typography variant="h6">Game Details</Typography>
            <IconButton onClick={()=> setSelected(null)}><CloseIcon /></IconButton>
          </Stack>
          <Divider sx={{ mb:2 }} />

          {selected && (
            <>
              <Typography variant="h5" sx={{ mb:1 }}>
                {selected.g.away} @ {selected.g.home}
              </Typography>
              <Typography sx={{ mb:1 }}>{new Date(selected.g.kickoff).toLocaleString()}</Typography>
              <Stack direction="row" gap={1} sx={{ mb:1 }}>
                {selected.g.week && <Chip size="small" label={`Week ${selected.g.week}`} />}
                {selected.g.tv && <Chip size="small" label={selected.g.tv} />}
              </Stack>

              {/* Live / Final status + score (if available) */}
              {(selected.g.homeScore != null && selected.g.awayScore != null) && (
                <Stack direction="row" spacing={1} sx={{ mb:1 }}>
                  <Chip
                    size="small"
                    color={/final/i.test(selected.g.status||"") ? "success" : "default"}
                    label={/final/i.test(selected.g.status||"") ? "Final" : (selected.g.status || "In Progress")}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selected.g.away} {selected.g.awayScore} — {selected.g.home} {selected.g.homeScore}
                  </Typography>
                </Stack>
              )}

              {/* Model pick (always) + verdict (finals only) */}
              {(() => {
                // 1) Get probability (prefer frozen 1h pre-kick)
                const pref = getPreferredProb(selected, pregameProbByKey, prob);
                const p = pref ? { home: pref.home, away: pref.away } : null;

                // 2) Always show the pregame/frozen pick if we have a probability
                const pick = p ? pickFromProb(p, selected.g.home, selected.g.away) : null;

                // 3) If the game is final, compute verdict using the same probability
                const finalVerdict = verdictForGame(selected.g, p); // returns null until final / tie
                const isFinalVerdict = finalVerdict && finalVerdict.final && !finalVerdict.tie;

                return (
                  <>
                    {/* Pregame/frozen model pick (always if p) */}
                    {pick ? (
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip size="small" color="primary" label="Model pick (pregame, frozen)" />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {pick.team} {pick.confidencePct}
                        </Typography>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip size="small" label="Model pick" />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          No pick available
                        </Typography>
                      </Stack>
                    )}

                    {/* Final verdict (only after the game ends) */}
                    {isFinalVerdict && (
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          size="small"
                          color={
                            finalVerdict.correct === true
                              ? "success"
                              : finalVerdict.correct === false
                              ? "error"
                              : "default"
                          }
                          label={
                            finalVerdict.correct === true
                              ? "Model: Correct"
                              : finalVerdict.correct === false
                              ? "Model: Upset"
                              : "Model: Unknown"
                          }
                        />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {finalVerdict.predicted === "home"
                            ? selected.g.home
                            : finalVerdict.predicted === "away"
                            ? selected.g.away
                            : "—"}
                          {finalVerdict.confidence != null
                            ? ` ${(finalVerdict.confidence * 100).toFixed(1)}%`
                            : ""}
                          {" · Actual "}
                          {finalVerdict.actual === "home" ? selected.g.home : selected.g.away}
                        </Typography>
                      </Stack>
                    )}
                  </>
                );
              })()}

              {/* Win probability block */}
              <Box sx={{ my:2 }}>
                <Typography variant="subtitle2" sx={{ mb:0.75 }}>
                  Win probability (simple model)
                </Typography>

                {(() => {
                  const pref = getPreferredProb(selected, pregameProbByKey, prob); // frozen if exists, else live
                  const freezeAt = selected ? freezeAtFor(selected.g) : null;
                  const isFrozen = Boolean(pref?.frozen);
                  const isBeforeFreeze = freezeAt ? Date.now() < freezeAt.getTime() : false;

                  // No value yet and we're still before freeze → brief spinner while live calc runs
                  if (!pref && isBeforeFreeze) {
                    return <LinearProgress sx={{ height: 6, borderRadius: 1 }} />;
                  }

                  // Edge case: no value even though we’re past freeze (or no freeze time)
                  if (!pref && !isBeforeFreeze) {
                    return (
                      <Typography variant="body2" sx={{ opacity: 0.85 }}>
                        Win probability unavailable.
                      </Typography>
                    );
                  }

                  // We have either frozen or live prob
                  const pct = Math.max(0, Math.min(100, (pref.home || 0) * 100));

                  return (
                    <>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2">{selected.g.home}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 10, borderRadius: 1 }}
                      />

                      {isFrozen ? (
                        <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.8 }}>
                          Frozen 1h pre-kickoff
                          {pref.frozen?.frozenAt
                            ? ` · at ${new Date(pref.frozen.frozenAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.8 }}>
                          Live pre-freeze estimate · will lock 1h before kickoff
                          {freezeAt
                            ? ` (${freezeAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`
                            : ""}
                        </Typography>
                      )}
                    </>
                  );
                })()}

              </Box>

              <List dense>
                {selected.g.venue && (
                  <ListItem><ListItemText primary="Venue" secondary={selected.g.venue} /></ListItem>
                )}
                {(selected.g.city || selected.g.state) && (
                  <ListItem><ListItemText primary="Location" secondary={`${selected.g.city??""} ${selected.g.state??""}`.trim()} /></ListItem>
                )}
              </List>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
