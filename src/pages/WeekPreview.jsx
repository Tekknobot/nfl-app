// src/pages/WeekPreview.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Divider, Stack, Chip,
  LinearProgress, Grid, Tooltip
} from "@mui/material";
import {
  startOfWeek, addDays, fetchGamesForDateBDL, getWinProbabilityForGame, dateKey
} from "../lib/nflShared";
import AdSlot from "../components/AdSlot";

export default function WeekPreview(){
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const weekStart = startOfWeek(new Date());

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      setLoading(true);
      try {
        // Load this week's 7 days
        const pulls = Array.from({ length: 7 }, (_, i) => fetchGamesForDateBDL(addDays(weekStart, i)));
        const days = await Promise.all(pulls);
        const flat = days.flat();

        // Compute probabilities
        const probs = {};
        await Promise.all(
          flat.map(async g => {
            try {
              const p = await getWinProbabilityForGame(g);
              probs[`${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`] = p;
            } catch {/* ignore per-game failures */}
          })
        );

        const withP = flat
          .map(g => {
            const k = `${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`;
            const p = probs[k];
            return { ...g, _p: p ? p.home : null, _note: p?.note };
          })
          .sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff));

        if (!cancelled) setGames(withP);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const highlights = useMemo(()=>{
    const g = games.filter(x => typeof x._p === "number");
    if (!g.length) return null;
    const fav  = [...g].sort((a,b)=> b._p - a._p)[0];
    const dog  = [...g].sort((a,b)=> a._p - b._p)[0];
    const coin = [...g].sort((a,b)=> Math.abs(0.5 - a._p) - Math.abs(0.5 - b._p))[0];
    return { fav, dog, coin };
  },[games]);

  const hasContent = !loading && games.length > 0;

  const fmtPct = (p) => `${(p * 100).toFixed(1)}%`;
  const pubStamp = new Date().toLocaleString();

  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p:{ xs:1.25, sm:2 } }}>
          {/* Page header */}
          <Stack direction={{ xs:"column", sm:"row" }} justifyContent="space-between" alignItems={{ xs:"flex-start", sm:"center" }} sx={{ mb: 1 }}>
            <Typography variant="h4" sx={{ letterSpacing: 0.5 }}>Week Preview</Typography>
            <Typography variant="caption" sx={{ opacity:.75 }}>Generated: {pubStamp}</Typography>
          </Stack>
          <Typography variant="caption" sx={{ display:"block", opacity:.8, mb:2 }}>
            Blended probabilities (70% market, 30% season model).
          </Typography>

          {/* TOP AD — only when content is ready */}
          {hasContent && (
            <Box sx={{ my: 2 }}>
              <AdSlot slot="0000000000" layout="in-article" format="fluid" />
            </Box>
          )}

          <Divider sx={{ mb:{ xs:1.25, sm:2 } }} />

          {/* Loading / Empty */}
          {loading ? (
            <LinearProgress />
          ) : !games.length ? (
            <Typography>No scheduled games found for this week.</Typography>
          ) : (
            <>
              {/* Summary strip */}
              <Stack direction={{ xs:"column", sm:"row" }} spacing={1} sx={{ mb:2 }}>
                <Chip label={`${games.length} matchups`} />
                {highlights?.fav && (
                  <Chip
                    color="success"
                    label={`Biggest Favorite: ${highlights.fav.home} (${fmtPct(highlights.fav._p)})`}
                  />
                )}
                {highlights?.dog && (
                  <Chip
                    color="warning"
                    label={`Biggest Underdog: ${highlights.dog.away} (${fmtPct(1 - highlights.dog._p)})`}
                  />
                )}
                {highlights?.coin && (
                  <Chip
                    color="default"
                    label={`Closest: ${highlights.coin.away} @ ${highlights.coin.home}`}
                  />
                )}
              </Stack>

              {/* MID AD — after summary, before highlights */}
              <Box sx={{ my: 2 }}>
                <AdSlot slot="0000000000" layout="in-article" format="fluid" />
              </Box>

              {/* Highlights grid */}
              {highlights && (
                <Grid container spacing={1.25} sx={{ mb:2 }}>
                  {[
                    { key:"fav",   title:"Biggest Favorite",           node:highlights.fav,  color:"success" },
                    { key:"dog",   title:"Biggest Underdog (visitor)", node:highlights.dog,  color:"warning" },
                    { key:"coin",  title:"Closest to a Coin-Flip",     node:highlights.coin, color:"default" },
                  ].map(({ key, title, node, color }) => node && (
                    <Grid item xs={12} md={4} key={key}>
                      <Card variant="outlined" sx={{ height:"100%" }}>
                        <CardContent sx={{ p:{ xs:1.25, sm:1.75 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" sx={{ fontWeight:700 }}>{title}</Typography>
                            <Chip label={new Date(node.kickoff).toLocaleString()} size="small" />
                          </Stack>

                          <Typography sx={{ mt:1, mb:.5, fontWeight:700 }}>
                            {node.away} @ {node.home}
                          </Typography>

                          {typeof node._p === "number" && (
                            <>
                              <Stack direction="row" justifyContent="space-between" sx={{ mb:0.5 }}>
                                <Typography variant="caption">{node.home}</Typography>
                                <Typography variant="caption" sx={{ fontWeight:700 }}>{fmtPct(node._p)}</Typography>
                              </Stack>
                              <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, node._p*100))} sx={{ height:8, borderRadius:1 }} />
                              {node._note && (
                                <Typography variant="caption" sx={{ display:"block", mt:.5, opacity:.7 }}>
                                  {node._note}
                                </Typography>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Divider sx={{ my:2 }} />

              {/* All matchups */}
              <Typography variant="h6" sx={{ mb:1 }}>All Matchups & Quick Notes</Typography>
              <Stack spacing={1.25}>
                {games.map((g,i)=>(
                  <Card key={i} variant="outlined">
                    <CardContent sx={{ p:{ xs:1, sm:1.5 } }}>
                      <Stack direction={{ xs:"column", sm:"row" }} justifyContent="space-between" alignItems={{ xs:"flex-start", sm:"center" }}>
                        <Typography sx={{ fontWeight:700 }}>
                          {g.away} @ {g.home}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity:.8 }}>
                          {new Date(g.kickoff).toLocaleString()}
                        </Typography>
                      </Stack>

                      {typeof g._p === "number" ? (
                        <Box sx={{ mt:.75 }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption">{g.home}</Typography>
                            <Typography variant="caption" sx={{ fontWeight:700 }}>{fmtPct(g._p)}</Typography>
                          </Stack>
                          <LinearProgress
                            aria-label={`Home win probability ${fmtPct(g._p)}`}
                            variant="determinate"
                            value={Math.min(100, Math.max(0, g._p * 100))}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                          {g._note && (
                            <Tooltip title={g._note}>
                              <Typography variant="caption" sx={{ display:"block", mt:.5, opacity:.7 }}>
                                {g._note}
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ opacity:.8, mt:.5 }}>
                          Probability unavailable.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {/* BOTTOM AD — after all content */}
              <Box sx={{ mt: 3 }}>
                <AdSlot slot="0000000000" layout="in-article" format="fluid" />
              </Box>

              <Divider sx={{ my:2 }} />
              <Typography variant="caption" sx={{ opacity:.75, display:"block" }}>
                Methodology: probabilities blend market moneylines (de-vigged) with a season model trained on completed games
                (learned offense/defense + home-field advantage). See About for details.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
