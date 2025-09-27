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
    const h = (g?.home_team?.abbreviation || "").toUpperCase();
    const v = (g?.visitor_team?.abbreviation || "").toUpperCase();
    return h === homeAbbr && v === awayAbbr;
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
  const hasScores = typeof g.home_score === "number" && typeof g.visitor_score === "number";
  const looksFinal = (g.status || "").toLowerCase().includes("final");
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
function DayPill({ d, selected, count, onClick }) {
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
      <Chip
        size="small"
        label={count ? `${count}` : '0'}
        color={count ? 'secondary' : 'default'}
        variant={selected ? 'filled' : 'outlined'}
        sx={{ mt: 0.9, height: 20, borderRadius: 0.75, '& .MuiChip-label': { px: .8, fontSize: 11, fontWeight: 700 } }}
      />
    </Button>
  );
}

function GameRow({ g, onClick }) {
  return (
    <Card variant="outlined" sx={{ borderRadius:1 }}>
      <ListItemButton onClick={onClick} sx={{ borderRadius:1, '&:hover': { bgcolor: 'rgba(255,255,255,.06)' } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width:'100%' }}>
          <Avatar sx={{ width:28, height:28, fontSize:12, bgcolor: TEAM_COLORS[g.home]||'primary.main', color:'primary.contrastText' }}>
            {g.home}
          </Avatar>

          <Box sx={{ flex:'1 1 auto', minWidth:0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                color:'rgba(255,255,255,.95)'
              }}
            >
              {g.away} @ {g.home}
            </Typography>
            <Typography variant="caption" sx={{ opacity:.8 }}>
              {fmtTime(g.kickoff)}
            </Typography>
          </Box>

          <Chip size="small" variant="outlined" icon={<SportsFootballIcon fontSize="small" />} label="Details" />
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

  // probability state
  const [prob, setProb] = useState(null);       // { home, away } or null
  const [probLoading, setProbLoading] = useState(false);
  const [probNote, setProbNote] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const stripRef = useRef(null);

  // Load schedule JSON once
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

  // Week days
  const week = useMemo(()=>{
    const start = startOfWeek(cursor);
    return Array.from({length:7}, (_,i)=> addDays(start,i));
  },[cursor]);

  // Bucket helper
  const gamesFor = (d)=> (data?.[dateKey(d)] || []).slice().sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff));

// Auto-select first day with games when week changes
useEffect(() => {
  const first = week.find(d => (data?.[dateKey(d)] || []).length > 0) || week[0];
  setSelectedDate(first);

  const key = dateKey(first);
  const id = setTimeout(() => {
    const el = stripRef.current?.querySelector?.(`[data-day="${key}"]`);
    if (el) el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, 50);

  return () => clearTimeout(id);
}, [week, data]);

  const selectedGames = gamesFor(selectedDate);

  // Compute win probability when a game is opened (same model as before)
  useEffect(()=>{
    let cancelled = false;
    async function computeProb() {
      setProb(null);
      setProbNote("");
      if (!selected?.g) return;
      setProbLoading(true);
      try {
        const g = selected.g;
        const season = new Date(g.kickoff).getFullYear();
        const homeAbbr = g.home;
        const awayAbbr = g.away;

        const [homeForm, awayForm] = await Promise.all([
          getTeamFormFromPastGames(homeAbbr, season),
          getTeamFormFromPastGames(awayAbbr, season)
        ]);

        const HFA = 2.0;
        let note = "Based on recent completed games (this & last season)";
        let margin;

        if (
          homeForm.ppg != null && homeForm.oppg != null &&
          awayForm.ppg != null && awayForm.oppg != null
        ) {
          const homeOff = homeForm.ppg;
          const awayDef = awayForm.oppg;
          const awayOff = awayForm.ppg;
          const homeDef = homeForm.oppg;
          margin = (homeOff - awayDef) - (awayOff - homeDef) + HFA;
        } else if (homeForm.ppg != null && awayForm.ppg != null) {
          margin = (homeForm.ppg - awayForm.ppg) + HFA;
          note = "Based on recent points per game (limited finals available)";
        } else {
          margin = HFA;
          note = "Insufficient past-game data; home advantage only";
        }

        const pHome = probFromMargin(margin, 7);
        if (!cancelled) {
          setProb({ home: pHome, away: 1 - pHome });
          setProbNote(note);
        }
      } catch (e) {
        if (!cancelled) {
          setProb(null);
          setProbNote("Could not compute probability (data unavailable or rate-limited).");
        }
      } finally {
        if (!cancelled) setProbLoading(false);
      }
    }
    computeProb();
    return ()=>{ cancelled = true; };
  }, [selected]);

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
        homeAbbr: selected.g.home,
        awayAbbr: selected.g.away
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


  /* ---------- Render ---------- */
  const weekLabel = `Week of ${monthName(startOfWeek(cursor))} ${startOfWeek(cursor).getDate()}, ${startOfWeek(cursor).getFullYear()}`;

  return (
    <Box sx={{ maxWidth: 720, mx:'auto', px:{ xs:1, sm:2 } }}>
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
        {week.map((d)=> {
          const key = dateKey(d);
          const count = gamesFor(d).length;
          const selected = dateKey(selectedDate) === key;
          return (
            <Box key={key} data-day={key} sx={{ flex:'0 0 auto' }}>
              <DayPill d={d} selected={selected} count={count} onClick={()=> setSelectedDate(d)} />
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
          ) : selectedGames.length ? (
            <Stack spacing={1}>
              {selectedGames.map((g, i)=>(
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

              {/* Win probability block */}
              <Box sx={{ my:2 }}>
                <Typography variant="subtitle2" sx={{ mb:0.75 }}>
                  Win probability (simple model)
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
                    Win probability unavailable (data not ready or rate-limited).
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
