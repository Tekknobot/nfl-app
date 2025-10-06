// src/pages/WeekPreview.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Box, Card, CardContent, Typography, Divider, Stack, Chip, LinearProgress } from "@mui/material";
import { startOfWeek, addDays, fetchGamesForDateBDL, getWinProbabilityForGame, dateKey } from "../lib/nflShared";

export default function WeekPreview(){
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const weekStart = startOfWeek(new Date());

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      setLoading(true);
      // load 7 days of this week
      const pulls = [];
      for (let i=0;i<7;i++) pulls.push(fetchGamesForDateBDL(addDays(weekStart,i)));
      const days = await Promise.all(pulls);
      const flat = days.flat();
      // compute probs
      const probs = {};
      await Promise.all(flat.map(async g=>{
        try{ const p = await getWinProbabilityForGame(g); probs[`${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`]=p; }catch{}
      }));
      const withP = flat.map(g=>{
        const k = `${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`;
        const p = probs[k];
        return { ...g, _p: p ? p.home : null, _note: p?.note };
      }).sort((a,b)=> new Date(a.kickoff)-new Date(b.kickoff));
      if (!cancelled){ setGames(withP); setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const highlights = useMemo(()=>{
    const g = games.filter(x=> typeof x._p === "number");
    if (!g.length) return null;
    const fav   = [...g].sort((a,b)=> b._p - a._p)[0];
    const dog   = [...g].sort((a,b)=> a._p - b._p)[0];
    const coin  = [...g].sort((a,b)=> Math.abs(0.5 - a._p) - Math.abs(0.5 - b._p))[0];
    return { fav, dog, coin };
  },[games]);

  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h4" sx={{ mb:1 }}>Week Preview</Typography>
          <Typography variant="caption" sx={{ opacity:.75, display:"block", mb:2 }}>
            Generated from current week’s schedule and SnappCount probabilities.
          </Typography>
          <Divider sx={{ mb:2 }} />

          {loading ? (
            <LinearProgress />
          ) : games.length === 0 ? (
            <Typography>No scheduled games found for this week.</Typography>
          ) : (
            <>
              {/* Narrative summary */}
              <Typography sx={{ mb:2 }}>
                This week features {games.length} matchups. Below are the biggest favorite, biggest underdog,
                and closest coin-flip according to our blended probability (70% market, 30% season model).
              </Typography>

              {/* Highlights */}
              {highlights && (
                <Stack spacing={2} sx={{ mb:2 }}>
                  {["fav","dog","coin"].map((k)=> highlights[k] && (
                    <Card key={k} variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">
                            {k === "fav" && "Biggest Favorite"}
                            {k === "dog" && "Biggest Underdog (visitor)"}
                            {k === "coin" && "Closest to a Coin-Flip"}
                          </Typography>
                          <Chip label={new Date(highlights[k].kickoff).toLocaleString()} />
                        </Stack>
                        <Typography sx={{ mt:1, mb:.5, fontWeight:700 }}>
                          {highlights[k].away} @ {highlights[k].home}
                        </Typography>
                        <Typography sx={{ opacity:.9 }}>
                          Home win probability: {(highlights[k]._p*100).toFixed(1)}%
                          {highlights[k]._note ? ` · ${highlights[k]._note}` : ""}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              {/* Per-game bullets (content! ) */}
              <Divider sx={{ my:2 }} />
              <Typography variant="h6" sx={{ mb:1 }}>All Matchups & Quick Notes</Typography>
              <Stack spacing={1.25}>
                {games.map((g,i)=>(
                  <Card key={i} variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight:700 }}>
                        {g.away} @ {g.home}
                      </Typography>
                      <Typography sx={{ opacity:.9 }}>
                        {new Date(g.kickoff).toLocaleString()}
                        {typeof g._p === "number" ? ` · Home win probability ${(g._p*100).toFixed(1)}%` : ""}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {/* Methodology blurb (E-E-A-T) */}
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
