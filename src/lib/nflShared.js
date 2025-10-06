// src/lib/nflShared.js
export const BDL_API = "https://api.balldontlie.io/nfl/v1";

const bdlHeaders = () => {
  const key = process.env.REACT_APP_BDL_KEY?.trim();
  return key ? { Accept: "application/json", Authorization: key } : { Accept: "application/json" };
};

export const pad = (n) => String(n).padStart(2,'0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
export const startOfWeek = (d)=>{
  const x=new Date(d); const dow=x.getDay();
  x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x;
};

// Canonicalize (same map you use)
export function canonAbbr(x){
  const k = String(x || "").toUpperCase();
  const map = { WAS:"WSH", WFT:"WSH", RED:"WSH", JAC:"JAX", TAM:"TB", NOR:"NO", GNB:"GB", SFO:"SF",
                ARZ:"ARI", SD:"LAC", OAK:"LV", STL:"LAR", LA:"LAR", NWE:"NE", KCC:"KC" };
  return map[k] || k;
}

export function isGameFinal(g){
  if (!g) return false;
  const hasScores = Number.isFinite(Number(g?.homeScore)) && Number.isFinite(Number(g?.awayScore));
  const looksFinal = /(final|completed|full\s*time|^ft$|ended|complete)/i.test(String(g?.status||""));
  return hasScores || looksFinal;
}

export function scoreNum(v){
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v.replace(/[^\d.-]/g,"")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// --- fetch daily games from BDL and normalize to your shape ---
export async function fetchGamesForDateBDL(dateObj) {
  const headers = bdlHeaders();
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2,"0");
  const d = String(dateObj.getDate()).padStart(2,"0");
  const dateISO = `${y}-${m}-${d}`;
  const u = new URL(`${BDL_API}/games`);
  u.searchParams.append("dates[]", dateISO);
  u.searchParams.set("per_page","100");
  const r = await fetch(u, { headers });
  if (!r.ok) return [];
  const j = await r.json();
  const list = Array.isArray(j?.data) ? j.data : [];
  return list.map(g=>{
    const kickoff = g?.date ? new Date(g.date).toISOString()
                            : new Date(y, Number(m)-1, Number(d), 13,0,0).toISOString();
    const home = canonAbbr(g?.home_team?.abbreviation || g?.home || "");
    const away = canonAbbr(g?.visitor_team?.abbreviation || g?.away || "");
    const status = g?.status || "";
    const homeScore = Number.isFinite(Number(g?.home_team_score)) ? Number(g.home_team_score)
                      : Number.isFinite(Number(g?.home_score))      ? Number(g.home_score) : null;
    const awayScore = Number.isFinite(Number(g?.visitor_team_score)) ? Number(g.visitor_team_score)
                      : Number.isFinite(Number(g?.away_score))         ? Number(g.away_score) : null;
    return { home, away, kickoff, week: g?.week ?? g?.game?.week ?? undefined, tv: g?.tv ?? undefined,
             status, homeScore, awayScore };
  }).filter(x=>x.home && x.away).sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff));
}

export function gameKey(g){
  const d = new Date(g.kickoff);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${key}|${(g.away||"").toUpperCase()}@${(g.home||"").toUpperCase()}`;
}

// --- model bits: import from your app if you prefer; kept inline here for simplicity ---
function impliedProbFromMoneyline(ml){
  if (ml == null || Number.isNaN(Number(ml))) return null;
  const n = Number(ml); if (n > 0) return 100/(n+100); if (n < 0) return -n/(-n+100); return null;
}

async function getTeamsMap(){
  const r = await fetch(`${BDL_API}/teams`, { headers: bdlHeaders() });
  if (!r.ok) throw new Error("teams fail");
  const j = await r.json(); const m = new Map();
  for (const t of j.data || []) if (t.abbreviation && t.id != null) m.set(t.abbreviation.toUpperCase(), String(t.id));
  return m;
}

function ensureTeamRating(off, def, abbr){ if(!off.has(abbr)) off.set(abbr,0); if(!def.has(abbr)) def.set(abbr,0); }
function probFromMargin(margin, sigma=7){ return 1/(1+Math.exp(-margin/sigma)); }

async function fetchTeamGamesForSeason(teamId, seasonYear){
  const out=[]; let cursor, guard=0;
  do{
    const p = new URLSearchParams();
    p.append("seasons[]", String(seasonYear)); p.append("team_ids[]", String(teamId)); p.set("per_page","100");
    if (cursor != null) p.set("cursor", String(cursor));
    const r = await fetch(`${BDL_API}/games?${p.toString()}`, { headers: bdlHeaders() });
    if (!r.ok) break;
    const j = await r.json(); out.push(...(j.data||[])); cursor = j.meta?.next_cursor ?? null;
    if (++guard > 8) break;
  } while(cursor != null);
  return out;
}

function isFinalGame(g){
  const hs = g?.home_team_score ?? g?.home_score ?? g?.homeScore ?? null;
  const vs = g?.visitor_team_score ?? g?.away_score ?? g?.awayScore ?? null;
  const hasScores = Number.isFinite(Number(hs)) && Number.isFinite(Number(vs));
  const looksFinal = /(final|completed|full\s*time|^ft$|ended|complete)/i.test(String(g?.status||""));
  return hasScores || looksFinal;
}

const _FINALS_CACHE = new Map();      // season -> finals[]
const _RATINGS_CACHE = new Map();     // season -> { off, def, hfa, sigma, meta }

async function getSeasonFinals(season){
  if (_FINALS_CACHE.has(season)) return _FINALS_CACHE.get(season);
  const teams = await getTeamsMap(); const finalsMap = new Map(); const pulls=[];
  for (const [,id] of teams.entries()){
    pulls.push(fetchTeamGamesForSeason(id, season).then(list=>{
      for (const g of list||[]){
        if (!isFinalGame(g)) continue;
        const home = canonAbbr(g?.home_team?.abbreviation || g.home || "");
        const away = canonAbbr(g?.visitor_team?.abbreviation || g.away || "");
        const hs = Number(g?.home_team_score ?? g?.home_score ?? g?.homeScore ?? NaN);
        const vs = Number(g?.visitor_team_score ?? g?.away_score ?? g?.awayScore ?? NaN);
        if (!home || !away || !Number.isFinite(hs) || !Number.isFinite(vs)) continue;
        finalsMap.set(`${g.id ?? g.date ?? Math.random()}|${away}@${home}`, { home, away, home_pts:hs, away_pts:vs, week:Number(g?.week ?? g?.game?.week ?? NaN) });
      }
    }).catch(()=>{}));
  }
  await Promise.all(pulls);
  const finals = Array.from(finalsMap.values());
  if (finals.length) _FINALS_CACHE.set(season, finals);
  return finals;
}

async function getSeasonRatings(season){
  if (_RATINGS_CACHE.has(season)) return _RATINGS_CACHE.get(season);
  const games = await getSeasonFinals(season);
  if (!games.length) return { off:new Map(), def:new Map(), hfa:2.0, sigma:7.0, meta:{ nGames:0, wMin:null, wMax:null } };
  const weeks = games.map(g=>g.week).filter(w=>Number.isFinite(w));
  const wMin = weeks.length ? Math.min(...weeks) : null; const wMax = weeks.length ? Math.max(...weeks) : null;
  const teamSet = new Set(games.flatMap(g=>[g.home,g.away]));
  const off = new Map(), def = new Map(); for(const t of teamSet){ off.set(t,0); def.set(t,0); }
  let hfa = games.reduce((s,g)=> s + (g.home_pts - g.away_pts), 0)/games.length;
  const weekWeight = (w)=> (Number.isFinite(w) && wMax!=null) ? Math.pow(0.85,(wMax-w)) : 1;
  const LR=0.015, EPOCHS=10;
  for(let epoch=0; epoch<EPOCHS; epoch++){
    for(const g of games){
      const w = weekWeight(g.week);
      const oh=off.get(g.home), dh=def.get(g.home), oa=off.get(g.away), da=def.get(g.away);
      const predH = oh - da + hfa, predA = oa - dh;
      const errH = g.home_pts - predH, errA = g.away_pts - predA;
      off.set(g.home, oh + LR*w*errH); def.set(g.away, da - LR*w*errH);
      off.set(g.away, oa + LR*w*errA); def.set(g.home, dh - LR*w*errA);
    }
    const meanOff = Array.from(off.values()).reduce((a,b)=>a+b,0)/off.size;
    const meanDef = Array.from(def.values()).reduce((a,b)=>a+b,0)/def.size;
    for (const t of off.keys()) off.set(t, off.get(t)-meanOff);
    for (const t of def.keys()) def.set(t, def.get(t)-meanDef);
    let hErr=0, wSum=0;
    for (const g of games){
      const w=weekWeight(g.week);
      const predM = (off.get(g.home)-def.get(g.away)) - (off.get(g.away)-def.get(g.home)) + hfa;
      const err = (g.home_pts - g.away_pts) - predM;
      hErr += w*err; wSum += w;
    }
    if (wSum>0) hfa += (LR*0.25) * (hErr/wSum);
  }
  let sse=0; for (const g of games){
    const predM = (off.get(g.home)-def.get(g.away)) - (off.get(g.away)-def.get(g.home)) + hfa;
    const err = (g.home_pts - g.away_pts) - predM; sse += err*err;
  }
  const n=games.length; const rmse = n ? Math.sqrt(sse/n) : 7.0;
  const sigma = Math.max(5.0, Math.min(12.0, rmse));
  const out = { off, def, hfa, sigma, meta:{ nGames:n, wMin, wMax } };
  _RATINGS_CACHE.set(season, out); return out;
}

export async function predictSeasonProb({ season, homeAbbr, awayAbbr }){
  const { off, def, hfa, sigma, meta } = await getSeasonRatings(season);
  const H = canonAbbr(homeAbbr), A = canonAbbr(awayAbbr);
  ensureTeamRating(off, def, H); ensureTeamRating(off, def, A);
  const margin = (off.get(H)-def.get(A)) - (off.get(A)-def.get(H)) + hfa;
  const pHome = probFromMargin(margin, sigma||7);
  const wSpan = (meta?.wMin!=null && meta?.wMax!=null) ? ` W${meta.wMin}–W${meta.wMax}` : "";
  const nPart = meta?.nGames!=null ? ` (n=${meta.nGames})` : "";
  return { pHome, note: `Season model: ${season}${wSpan} finals${nPart}, HFA=${(hfa??0).toFixed(1)}, σ=${(sigma??7).toFixed(1)}` };
}

// Pro moneylines (simplified path). Feel free to swap with your full version.
async function fetchGameMoneylinesBDLPro({ dateISO, homeAbbr, awayAbbr }){
  const key = process.env.REACT_APP_BDL_KEY?.trim(); if (!key) return null;
  const headers = { Accept:"application/json", Authorization:key };
  const u = new URL(`${BDL_API}/odds`); u.searchParams.set("date", dateISO); u.searchParams.set("sport","nfl"); u.searchParams.set("per_page","100");
  try{
    const r = await fetch(u, { headers }); if (!r.ok) return null;
    const j = await r.json(); const list = Array.isArray(j?.data)? j.data : [];
    const row = list.find(item=>{
      const h = item?.home_team?.abbreviation ?? item?.home; const a = item?.visitor_team?.abbreviation ?? item?.away;
      return canonAbbr(h)===canonAbbr(homeAbbr) && canonAbbr(a)===canonAbbr(awayAbbr);
    });
    if (!row) return null;
    const market = Array.isArray(row?.markets) ? row.markets.find(m=>/moneyline/i.test(m?.name||m?.type||"")) : null;
    const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
    const home = outcomes.find(o=>/(home|h)/i.test(String(o?.side||o?.selection||"")))?.price ?? null;
    const away = outcomes.find(o=>/(away|a|visitor)/i.test(String(o?.side||o?.selection||"")))?.price ?? null;
    if (home==null || away==null) return null;
    return { mlHome:Number(home), mlAway:Number(away) };
  }catch{return null;}
}

export async function getWinProbabilityForGame(g){
  const season = new Date(g.kickoff).getFullYear();
  const homeAbbr = canonAbbr(g.home), awayAbbr = canonAbbr(g.away);
  // model
  const seasonRes = await predictSeasonProb({ season, homeAbbr, awayAbbr });
  const pModel = seasonRes?.pHome ?? null;
  // market
  const d=new Date(g.kickoff);
  const dateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const pro = await fetchGameMoneylinesBDLPro({ dateISO, homeAbbr, awayAbbr });
  let pMarket=null;
  if (pro?.mlHome!=null && pro?.mlAway!=null){
    const pH = impliedProbFromMoneyline(pro.mlHome), pA = impliedProbFromMoneyline(pro.mlAway);
    const sum = (pH??0)+(pA??0); if (pH!=null && pA!=null && sum>0) pMarket = pH/sum; // de-vig
  }
  // blend
  let pHome, note;
  if (pMarket!=null && pModel!=null){ const ALPHA=0.70; pHome = ALPHA*pMarket + (1-ALPHA)*pModel; note=`Blended (70% market) · ${seasonRes.note}`; }
  else if (pMarket!=null){ pHome=pMarket; note="Based on moneylines (de-vigged)"; }
  else if (pModel!=null){ pHome=pModel; note=seasonRes.note; }
  else { const HFA=2.0; pHome = 1/(1+Math.exp(-HFA/7)); note="Fallback: HFA only"; }
  return { home: Math.max(0,Math.min(1,pHome)), away: 1-Math.max(0,Math.min(1,pHome)), note };
}

export function verdictForGame(g, prob){
  const final = isGameFinal(g);
  if (!final) return null;
  const hs = scoreNum(g?.homeScore); const as = scoreNum(g?.awayScore);
  if (hs==null || as==null || hs===as) return { final:true, tie:true };
  const actual = hs>as ? "home" : "away";
  if (!prob || typeof prob.home!=="number" || typeof prob.away!=="number") return { final:true, actual, predicted:null, correct:null, confidence:null };
  const predicted = prob.home >= prob.away ? "home" : "away";
  const confidence = Math.max(prob.home, prob.away);
  return { final:true, actual, predicted, correct: predicted===actual, confidence };
}
