// src/pages/WeekRecap.jsx
import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Divider, Stack, Chip, LinearProgress } from "@mui/material";
import { startOfWeek, addDays, fetchGamesForDateBDL, getWinProbabilityForGame, verdictForGame, dateKey } from "../lib/nflShared";

export default function WeekRecap(){
  const [loading, setLoading] = useState(true);
  const [finals, setFinals] = useState([]);
  // recap last week
  const weekStart = startOfWeek(addDays(new Date(), -7));

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      setLoading(true);
      const pulls = [];
      for (let i=0;i<7;i++) pulls.push(fetchGamesForDateBDL(addDays(weekStart,i)));
      const flat = (await Promise.all(pulls)).flat();
      // compute probs & verdicts for finals
      const rows = [];
      for (const g of flat){
        const p = await getWinProbabilityForGame(g).catch(()=>null);
        const prob = p ? { home:p.home, away:p.away } : null;
        const v = verdictForGame(g, prob);
        if (v && v.final && !v.tie){
          rows.push({ ...g, _prob:prob, _verdict:v });
        }
      }
      rows.sort((a,b)=> new Date(a.kickoff) - new Date(b.kickoff));
      if (!cancelled){ setFinals(rows); setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const summary = (() => {
    const n = finals.length;
    const correct = finals.filter(r=>r._verdict.correct===true).length;
    const upset   = finals.filter(r=>r._verdict.correct===false).length;
    const acc = n ? (correct/n)*100 : 0;
    return { n, correct, upset, acc };
  })();

  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h4" sx={{ mb:1 }}>Last Week Recap</Typography>
          <Typography variant="caption" sx={{ opacity:.75, display:"block", mb:2 }}>
            Final results vs. our pregame probability (closest available).
          </Typography>
          <Divider sx={{ mb:2 }} />

          {loading ? (
            <LinearProgress />
          ) : summary.n === 0 ? (
            <Typography>No completed games were found for last week.</Typography>
          ) : (
            <>
              {/* Summary paragraph */}
              <Typography sx={{ mb:2 }}>
                We analyzed {summary.n} completed games from last week. The model recorded {summary.correct} correct picks
                and {summary.upset} upsets, for an overall accuracy of {summary.acc.toFixed(1)}%.
              </Typography>

              {/* Per-game notes */}
              <Stack spacing={1.25}>
                {finals.map((g,i)=>(
                  <Card key={i} variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight:700 }}>
                          {g.away} @ {g.home}
                        </Typography>
                        <Chip label={new Date(g.kickoff).toLocaleString()} />
                      </Stack>
                      <Typography sx={{ mb:.5 }}>
                        Final: {g.away} {g.awayScore} — {g.home} {g.homeScore}
                      </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                    {/* model pick + confidence */}
                    <Typography sx={{ opacity:.9 }}>
                        Model pick: <strong>{g._verdict.predicted === "home" ? g.home : g.away}</strong>
                        {g._verdict.confidence != null ? ` (${(g._verdict.confidence * 100).toFixed(1)}%)` : ""}
                    </Typography>

                    {/* result chip */}
                    <Chip
                        size="small"
                        label={g._verdict.correct ? "Correct" : "Upset"}
                        color={g._verdict.correct ? "success" : "error"}
                        sx={{ fontWeight: 700 }}
                    />
                    </Stack>

                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {/* Methodology line */}
              <Divider sx={{ my:2 }} />
              <Typography variant="caption" sx={{ opacity:.75, display:"block" }}>
                Methodology: verdicts compare pregame (or closest available) probability to final outcomes.
                “Upset” means the non-favored side won.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
