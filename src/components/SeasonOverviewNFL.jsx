import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Chip, Divider, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Tooltip
} from "@mui/material";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";

/** Fallback canonAbbr if you don't pass one in props */
function localCanonAbbr(x) {
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

/** Static team metadata */
const TEAM_META = {
  BUF:{city:"Buffalo",name:"Bills",conf:"AFC",div:"East"},
  MIA:{city:"Miami",name:"Dolphins",conf:"AFC",div:"East"},
  NE:{city:"New England",name:"Patriots",conf:"AFC",div:"East"},
  NYJ:{city:"New York",name:"Jets",conf:"AFC",div:"East"},
  BAL:{city:"Baltimore",name:"Ravens",conf:"AFC",div:"North"},
  CIN:{city:"Cincinnati",name:"Bengals",conf:"AFC",div:"North"},
  CLE:{city:"Cleveland",name:"Browns",conf:"AFC",div:"North"},
  PIT:{city:"Pittsburgh",name:"Steelers",conf:"AFC",div:"North"},
  HOU:{city:"Houston",name:"Texans",conf:"AFC",div:"South"},
  IND:{city:"Indianapolis",name:"Colts",conf:"AFC",div:"South"},
  JAX:{city:"Jacksonville",name:"Jaguars",conf:"AFC",div:"South"},
  TEN:{city:"Tennessee",name:"Titans",conf:"AFC",div:"South"},
  DEN:{city:"Denver",name:"Broncos",conf:"AFC",div:"West"},
  KC:{city:"Kansas City",name:"Chiefs",conf:"AFC",div:"West"},
  LAC:{city:"LA",name:"Chargers",conf:"AFC",div:"West"},
  LV:{city:"Las Vegas",name:"Raiders",conf:"AFC",div:"West"},
  DAL:{city:"Dallas",name:"Cowboys",conf:"NFC",div:"East"},
  NYG:{city:"New York",name:"Giants",conf:"NFC",div:"East"},
  PHI:{city:"Philadelphia",name:"Eagles",conf:"NFC",div:"East"},
  WSH:{city:"Washington",name:"Commanders",conf:"NFC",div:"East"},
  CHI:{city:"Chicago",name:"Bears",conf:"NFC",div:"North"},
  DET:{city:"Detroit",name:"Lions",conf:"NFC",div:"North"},
  GB:{city:"Green Bay",name:"Packers",conf:"NFC",div:"North"},
  MIN:{city:"Minnesota",name:"Vikings",conf:"NFC",div:"North"},
  ATL:{city:"Atlanta",name:"Falcons",conf:"NFC",div:"South"},
  CAR:{city:"Carolina",name:"Panthers",conf:"NFC",div:"South"},
  NO:{city:"New Orleans",name:"Saints",conf:"NFC",div:"South"},
  TB:{city:"Tampa Bay",name:"Buccaneers",conf:"NFC",div:"South"},
  ARI:{city:"Arizona",name:"Cardinals",conf:"NFC",div:"West"},
  LAR:{city:"LA",name:"Rams",conf:"NFC",div:"West"},
  SEA:{city:"Seattle",name:"Seahawks",conf:"NFC",div:"West"},
  SF:{city:"San Francisco",name:"49ers",conf:"NFC",div:"West"},
};

const pct = (w,l,t)=> (w + l + t) ? (w + 0.5*t) / (w + l + t) : 0;

/** finals: [{home, away, home_pts, away_pts}] */
function computeStandings(finals, canonAbbr) {
  const rows = new Map();

  // tally W/L/T and PF/PA
  for (const g of finals || []) {
    const H = canonAbbr(g.home); const A = canonAbbr(g.away);
    const hs = Number(g.home_pts); const as = Number(g.away_pts);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;

    for (const abbr of [H, A]) {
      if (!TEAM_META[abbr]) continue;
      if (!rows.has(abbr)) {
        const meta = TEAM_META[abbr];
        rows.set(abbr, { abbr, w:0, l:0, t:0, pf:0, pa:0, diff:0, last5:"0-0", conf:meta.conf, div:meta.div });
      }
    }

    if (!rows.has(H) || !rows.has(A)) continue;

    if (hs === as) {
      rows.get(H).t += 1; rows.get(A).t += 1;
    } else if (hs > as) {
      rows.get(H).w += 1; rows.get(A).l += 1;
    } else {
      rows.get(A).w += 1; rows.get(H).l += 1;
    }

    rows.get(H).pf += hs; rows.get(H).pa += as;
    rows.get(A).pf += as; rows.get(A).pa += hs;
  }

  // last 5 per team
  const byTeamGames = new Map();
  for (const g of finals || []) {
    const H = canonAbbr(g.home), A = canonAbbr(g.away);
    if (!TEAM_META[H] || !TEAM_META[A]) continue;
    byTeamGames.set(H, [ ...(byTeamGames.get(H)||[]), g ]);
    byTeamGames.set(A, [ ...(byTeamGames.get(A)||[]), g ]);
  }
  for (const [abbr, list] of byTeamGames.entries()) {
    const last5 = list.slice(-5);
    let w=0,l=0,t=0;
    for (const g of last5) {
      const hs = Number(g.home_pts), as = Number(g.away_pts);
      const isHome = canonAbbr(g.home) === abbr;
      const my = isHome ? hs : as;
      const opp = isHome ? as : hs;
      if (!Number.isFinite(my) || !Number.isFinite(opp)) continue;
      if (my > opp) w++; else if (my < opp) l++; else t++;
    }
    const r = rows.get(abbr);
    if (r) r.last5 = `${w}-${l}${t?`-${t}`:""}`;
  }

  for (const r of rows.values()) r.diff = r.pf - r.pa;

  const out = {
    AFC: { East: [], North: [], South: [], West: [] },
    NFC: { East: [], North: [], South: [], West: [] },
  };

  for (const r of rows.values()) out[r.conf][r.div].push(r);

  const sorter = (a,b)=>{
    const ap = pct(a.w,a.l,a.t), bp = pct(b.w,b.l,b.t);
    if (bp !== ap) return bp - ap;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.pf - a.pf;
  };
  ["AFC","NFC"].forEach(conf=>{
    ["East","North","South","West"].forEach(div=>{
      out[conf][div].sort(sorter);
    });
  });

  return out;
}

function DivisionTable({ title, teams }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 1.25 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
          <Chip size="small" icon={<SportsFootballIcon fontSize="small" />} label={`${teams.length} teams`} />
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Team</TableCell>
                <TableCell align="right">W</TableCell>
                <TableCell align="right">L</TableCell>
                <TableCell align="right">T</TableCell>
                <TableCell align="right">PCT</TableCell>
                <TableCell align="right">PF</TableCell>
                <TableCell align="right">PA</TableCell>
                <TableCell align="right">DIFF</TableCell>
                <TableCell align="right">Last 5</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map(t => (
                <TableRow key={t.abbr} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{t.abbr}</TableCell>
                  <TableCell align="right">{t.w}</TableCell>
                  <TableCell align="right">{t.l}</TableCell>
                  <TableCell align="right">{t.t || "—"}</TableCell>
                  <TableCell align="right">{pct(t.w,t.l,t.t).toFixed(3)}</TableCell>
                  <TableCell align="right">{t.pf}</TableCell>
                  <TableCell align="right">{t.pa}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.diff >= 0 ? "success.main" : "error.main" }}>
                    {t.diff >= 0 ? `+${t.diff}` : t.diff}
                  </TableCell>
                  <TableCell align="right">{t.last5}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

/** iterate Map or plain object */
function forEachEntry(m, fn) {
  if (!m) return;
  if (m instanceof Map) {
    m.forEach((v, k) => fn(v, k));
  } else {
    Object.keys(m).forEach(k => fn(m[k], k));
  }
}

function PowerRatingsTable({ ratings }) {
  const rows = useMemo(() => {
    const list = [];
    const offMap = ratings?.off || new Map();
    const defMap = ratings?.def || new Map();

    // collect all team keys present in either map
    const keys = new Set();
    forEachEntry(offMap, (_, k)=> keys.add(k));
    forEachEntry(defMap, (_, k)=> keys.add(k));

    keys.forEach(abbr => {
      const off = (offMap instanceof Map ? offMap.get(abbr) : offMap[abbr]) ?? 0;
      const def = (defMap instanceof Map ? defMap.get(abbr) : defMap[abbr]) ?? 0;
      if (TEAM_META[abbr]) list.push({ abbr, off, def, net: off - def });
    });

    return list.sort((a,b)=> b.net - a.net).map((r,i)=> ({ rank: i+1, ...r }));
  }, [ratings]);

  return (
    <Card variant="outlined" sx={{ borderRadius:1 }}>
      <CardContent sx={{ p:1.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:800 }}>Power Ratings (season model)</Typography>
          <Tooltip title="Net = Off − Def (higher is better)">
            <Chip size="small" label="Explainer" />
          </Tooltip>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>RK</TableCell>
                <TableCell>Team</TableCell>
                <TableCell align="right">Off</TableCell>
                <TableCell align="right">Def</TableCell>
                <TableCell align="right">Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r=>(
                <TableRow key={r.abbr} hover>
                  <TableCell sx={{ width: 48 }}>{r.rank}</TableCell>
                  <TableCell sx={{ fontWeight:700 }}>{r.abbr}</TableCell>
                  <TableCell align="right">{r.off.toFixed(1)}</TableCell>
                  <TableCell align="right">{r.def.toFixed(1)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight:700 }}>{r.net.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" sx={{ display:"block", mt:1, opacity:.8 }}>
          Higher Off = more points scored than average; lower Def (negative) = fewer points allowed than average.
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Props:
 * - getSeasonFinals(season:number) -> Promise<FinalGame[]>
 * - getSeasonRatings(season:number) -> Promise<{off:Map|obj, def:Map|obj, hfa:number, sigma:number}>
 * - canonAbbr?: (abbr:string)=>string (optional; fallback included)
 */
export default function SeasonOverviewNFL(props) {
  const canon = props.canonAbbr || localCanonAbbr;
  const [tab, setTab] = useState(0);
  const [finals, setFinals] = useState(null);
  const [ratings, setRatings] = useState(null);

  useEffect(() => {
    let cancel = false;
    const season = new Date().getFullYear();

    async function load() {
      try {
        if (typeof props.getSeasonFinals !== "function" || typeof props.getSeasonRatings !== "function") {
          console.warn("[SeasonOverviewNFL] Missing getSeasonFinals/getSeasonRatings props.");
          setFinals([]); setRatings(null);
          return;
        }
        const [f, r] = await Promise.all([
          props.getSeasonFinals(season),
          props.getSeasonRatings(season)
        ]);
        if (!cancel) { setFinals(Array.isArray(f) ? f : []); setRatings(r || null); }
      } catch (e) {
        if (!cancel) { setFinals([]); setRatings(null); }
      }
    }
    load();
    return () => { cancel = true; };
  }, [props.getSeasonFinals, props.getSeasonRatings]);

  const standings = useMemo(()=>{
    if (!finals || !finals.length) return null;
    return computeStandings(finals, canon);
  }, [finals, canon]);

  return (
    <Box sx={{ mb: 2 }}>
      <Card variant="outlined" sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h6" sx={{ letterSpacing: 0.5, fontWeight: 800 }}>Season Overview</Typography>
            <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" allowScrollButtonsMobile>
              <Tab label="Standings" />
              <Tab label="Power Ratings" />
            </Tabs>
          </Stack>
          <Divider sx={{ mb: 1 }} />

          {tab === 0 && (
            <>
              {!standings ? (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Loading standings…</Typography>
              ) : (
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: .5 }}>AFC</Typography>
                  <Stack direction={{ xs:"column", sm:"row" }} spacing={1.25}>
                    <DivisionTable title="AFC East"  teams={standings.AFC.East}  />
                    <DivisionTable title="AFC North" teams={standings.AFC.North} />
                  </Stack>
                  <Stack direction={{ xs:"column", sm:"row" }} spacing={1.25}>
                    <DivisionTable title="AFC South" teams={standings.AFC.South} />
                    <DivisionTable title="AFC West"  teams={standings.AFC.West}  />
                  </Stack>

                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>NFC</Typography>
                  <Stack direction={{ xs:"column", sm:"row" }} spacing={1.25}>
                    <DivisionTable title="NFC East"  teams={standings.NFC.East}  />
                    <DivisionTable title="NFC North" teams={standings.NFC.North} />
                  </Stack>
                  <Stack direction={{ xs:"column", sm:"row" }} spacing={1.25}>
                    <DivisionTable title="NFC South" teams={standings.NFC.South} />
                    <DivisionTable title="NFC West"  teams={standings.NFC.West}  />
                  </Stack>
                </Stack>
              )}
            </>
          )}

          {tab === 1 && (
            <>
              {!ratings || !(ratings.off instanceof Map ? ratings.off.size : Object.keys(ratings.off || {}).length) ? (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Loading ratings…</Typography>
              ) : (
                <PowerRatingsTable ratings={ratings} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
