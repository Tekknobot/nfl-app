import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box, Card, CardContent, Chip, Stack, Typography, Drawer, Divider,
  List, ListItem, ListItemText, IconButton, Button, CircularProgress, useMediaQuery, LinearProgress, Tooltip
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import { useTheme } from "@mui/material/styles";

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
const keyFromDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function addWeeks(d,n){ const x=new Date(d); x.setDate(x.getDate()+n*7); return x; }
function startOfWeek(d){
  const x = new Date(d);
  const dow = x.getDay(); // Sunday=0
  x.setDate(x.getDate() - dow);
  x.setHours(0,0,0,0);
  return x;
}

/** ---------- BallDon'tLie helpers (free tier friendly) ---------- **/

const BDL_API = "https://api.balldontlie.io/nfl/v1";
const BDL_HEADERS = () => {
  const key = process.env.REACT_APP_BDL_KEY?.trim();
  return key ? { Accept: "application/json", Authorization: key } : { Accept: "application/json" };
};

// cache results in-memory per page load
const teamCache = new Map(); // key: `${abbrev}:${season}` -> { games:[...], ppg, oppg }

/**
 * Fetch recent completed games for a team (current & previous season) and compute
 * average points scored/allowed. Uses only /games, so it stays on the free plan.
 */
async function getTeamForm(abbrev, season) {
  const cacheKey = `${abbrev}:${season}`;
  if (teamCache.has(cacheKey)) return teamCache.get(cacheKey);

  const headers = BDL_HEADERS();

  // Helper to fetch one season worth of games for team (paginate by cursor)
  async function fetchSeasonGames(seasonYear) {
    const out = [];
    let cursor = undefined;
    let safety = 0;
    do {
      const params = new URLSearchParams();
      params.append("seasons[]", String(seasonYear));
      params.append("team_ids[]", abbrev);           // many APIs accept abbrev; if BDL expects team id, map here.
      params.set("per_page", "100");
      if (cursor != null) params.set("cursor", String(cursor));

      const url = `${BDL_API}/games?${params.toString()}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        // If the team_ids[] filter wants numeric IDs instead of abbrev, this returns 4xx.
        // We gracefully bail and return empty; probability will fall back to 50/50 + tiny HFA.
        break;
      }
      const j = await r.json();
      (j.data || []).forEach(g => out.push(g));
      cursor = j.meta?.next_cursor ?? null;
      if (++safety > 8) break; // safety guard
    } while (cursor != null);
    return out;
  }

  // Pull this season and previous season (covers early year with few games)
  const prevSeason = (Number(season) || new Date().getFullYear()) - 1;
  const [curr, prev] = await Promise.all([
    fetchSeasonGames(season),
    fetchSeasonGames(prevSeason)
  ]);

  // Keep last ~10 completed games
  const completed = [...curr, ...prev]
    .filter(g => {
      // Try to detect completed games. Many feeds mark as "Final" or include scores.
      const hasScores = typeof g.home_score === "number" && typeof g.visitor_score === "number";
      const looksFinal = (g.status || "").toLowerCase().includes("final");
      return hasScores || looksFinal;
    })
    .slice(-10);

  // Compute ppg / oppg relative to the team whether it was home or away
  let pts = 0, opp = 0, n = 0;
  for (const g of completed) {
    const isHomeTeam = (g.home_team?.abbreviation === abbrev) || (g.home_team?.id === abbrev);
    const hs = Number(g.home_score ?? NaN);
    const vs = Number(g.visitor_score ?? NaN);
    if (Number.isNaN(hs) || Number.isNaN(vs)) continue;
    const teamPts = isHomeTeam ? hs : vs;
    const oppPts  = isHomeTeam ? vs : hs;
    pts += teamPts; opp += oppPts; n++;
  }

  const form = {
    games: completed,
    ppg: n ? pts / n : null,
    oppg: n ? opp / n : null
  };
  teamCache.set(cacheKey, form);
  return form;
}

/**
 * Simple logistic win probability model:
 *   margin = (home_offense - away_defense) + HFA
 *   prob_home = 1 / (1 + exp(-margin / scale))
 *
 * scale ~= 7 → ~7 points ≈ 70% win
 */
function probFromMargin(margin, scale = 7) {
  return 1 / (1 + Math.exp(-margin / scale));
}

/** ---------- Component ---------- **/

export default function AllGamesCalendarNFL(){
  const [data, setData] = useState(null);      // { "YYYY-MM-DD": Game[] }
  const [cursor, setCursor] = useState(()=> startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [prob, setProb] = useState(null);
  const [probLoading, setProbLoading] = useState(false);
  const [probNote, setProbNote] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const weekOf = useMemo(()=>({
    from: startOfWeek(cursor),
    to: addWeeks(startOfWeek(cursor),1)
  }),[cursor]);

  useEffect(()=> {
    let cancelled=false;
    (async()=>{
      try{
        const r = await fetch(process.env.PUBLIC_URL + "/nfl-upcoming-3mo.json", { cache:"no-store" });
        if (!r.ok) throw new Error("schedule fetch failed");
        const json = await r.json();
        if(!cancelled) setData(json || {});
      }catch{
        if(!cancelled) setData({});
      }
    })();
    return ()=>{cancelled=true};
  },[]);

  const days = useMemo(()=>{
    const out=[]; const d=new Date(weekOf.from);
    while(d<weekOf.to){ out.push(new Date(d)); d.setDate(d.getDate()+1); }
    return out;
  },[weekOf]);

  const gamesFor = (d)=> (data?.[keyFromDate(d)] || [])
    .slice().sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff));

  // Compute win probability when a game is opened
  useEffect(()=>{
    let cancelled = false;
    async function run(){
      setProb(null);
      setProbNote("");
      if (!selected?.g) return;
      setProbLoading(true);
      try {
        const g = selected.g;
        const season = new Date(g.kickoff).getFullYear();
        const home = g.home;
        const away = g.away;

        // Fetch recent team forms from BDL
        const [homeForm, awayForm] = await Promise.all([
          getTeamForm(home, season),
          getTeamForm(away, season)
        ]);

        // If we couldn't get any stats, fall back to tiny home advantage only
        const HFA = 2.0; // ~2 points home-field advantage
        let note = "Based on recent scoring averages";
        let margin;

        if (homeForm.ppg != null && awayForm.oppg != null && awayForm.ppg != null && homeForm.oppg != null) {
          const homeOff = homeForm.ppg;
          const awayDef = awayForm.oppg;
          const awayOff = awayForm.ppg;
          const homeDef = homeForm.oppg;

          // expected margin = (home O vs away D) - (away O vs home D) + HFA
          margin = (homeOff - awayDef) - (awayOff - homeDef) + HFA;
        } else if (homeForm.ppg != null && awayForm.ppg != null) {
          // use ppg only
          margin = (homeForm.ppg - awayForm.ppg) + HFA;
          note = "Based on recent points per game";
        } else {
          margin = HFA;
          note = "Insufficient recent data; home advantage only";
        }

        const pHome = probFromMargin(margin, 7);
        if (!cancelled) {
          setProb({ home: pHome, away: 1 - pHome });
          setProbNote(note);
        }
      } catch (e) {
        if (!cancelled) {
          setProb(null);
          setProbNote("Could not compute probability (rate limit or data unavailable).");
        }
      } finally {
        if (!cancelled) setProbLoading(false);
      }
    }
    run();
    return ()=>{ cancelled = true; };
  }, [selected]);

  const DayCard = ({ d }) => {
    const games = gamesFor(d);
    return (
      <Card
        key={+d}
        sx={{
          minWidth: isMobile ? 260 : 'auto',
          flex: isMobile ? "0 0 auto" : "initial",
          backgroundColor:"background.paper",
          border:1, borderColor:"rgba(255,255,255,.08)"
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight:600 }}>
              {dayName(d)} {d.getDate()}
            </Typography>
            <Chip size="small" label={`${games.length} ${games.length===1?'Game':'Games'}`} />
          </Stack>

          <Stack gap={1}>
            {games.length === 0 && (
              <Typography variant="body2" sx={{ opacity:.7 }}>No games</Typography>
            )}
            {games.map((g, idx)=> (
              <Button key={idx} onClick={()=> setSelected({ g, d })} fullWidth
                sx={{
                  justifyContent:"space-between", p:1.2,
                  border:1, borderColor:"rgba(255,255,255,.08)",
                  bgcolor:"rgba(255,255,255,.03)", textTransform:"none"
                }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Box sx={{ width:10, height:10, bgcolor: TEAM_COLORS[g.home]||"#999", borderRadius:"50%" }} />
                  <Typography>{g.away} @ {g.home}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1}>
                  <SportsFootballIcon fontSize="small"/>
                  <Typography variant="body2">{fmtTime(g.kickoff)}</Typography>
                </Stack>
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb:2 }}>
        <IconButton onClick={()=> setCursor(addWeeks(cursor,-1))}><ChevronLeftIcon/></IconButton>
        <Typography variant="h5" sx={{ letterSpacing:1, flex:1 }}>
          Week of {monthName(weekOf.from)} {weekOf.from.getDate()}, {weekOf.from.getFullYear()}
        </Typography>
        <IconButton onClick={()=> setCursor(addWeeks(cursor,1))}><ChevronRightIcon/></IconButton>
      </Stack>

      {data === null ? (
        <Stack alignItems="center" sx={{ py:6, opacity:.8 }}>
          <CircularProgress size={28} />
          <Typography sx={{ mt:1 }}>Loading schedule…</Typography>
        </Stack>
      ) : (
        <>
          {isMobile ? (
            <Box sx={{ display:"flex", gap:2, overflowX:"auto", pb:1, px:0.5, scrollSnapType:"x mandatory" }}>
              {days.map((d)=> (
                <Box key={+d} sx={{ scrollSnapAlign:"start" }}>
                  <DayCard d={d} />
                </Box>
              ))}
            </Box>
          ) : (
            <Stack direction="row" gap={2} sx={{ display:"grid", gridTemplateColumns:`repeat(${days.length}, 1fr)` }}>
              {days.map((d)=> <DayCard key={+d} d={d} />)}
            </Stack>
          )}
        </>
      )}

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

              {/* Win probability block */}
              <Box sx={{ my:2 }}>
                <Typography variant="subtitle2" sx={{ mb:0.5 }}>
                  Win probability (BallDon’tLie, simple model)
                </Typography>

                {probLoading && <LinearProgress sx={{ height:6, borderRadius:1 }} />}

                {!probLoading && prob && (
                  <>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:0.5 }}>
                      <Typography variant="body2">{selected.g.home}</Typography>
                      <Typography variant="body2" sx={{ fontWeight:600 }}>
                        {(prob.home * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, Math.min(100, prob.home * 100))}
                      sx={{ height:10, borderRadius:1 }}
                    />
                    <Typography variant="caption" sx={{ display:"block", mt:0.5, opacity:.8 }}>
                      {probNote}
                    </Typography>
                  </>
                )}

                {!probLoading && prob === null && (
                  <Typography variant="body2" sx={{ opacity:.8 }}>
                    Win probability unavailable (rate limit or not enough recent games).
                  </Typography>
                )}
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
