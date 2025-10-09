// src/pages/WeekPreviewPost.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Divider, Stack, Chip,
  LinearProgress, Grid
} from "@mui/material";
import {
  startOfWeek, addDays, fetchGamesForDateBDL, getWinProbabilityForGame, dateKey
} from "../lib/nflShared";

// Small, consistent ad label
const AdLabel = () => (
  <Typography
    variant="overline"
    sx={{
      display: "block",
      letterSpacing: 1,
      opacity: 0.7,
      mb: 0.5
    }}
    aria-label="Advertisement"
  >
    Advertisement
  </Typography>
);

export default function WeekPreviewPost() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const weekStart = startOfWeek(new Date());
  const pubStamp = new Date().toLocaleString();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const pulls = Array.from({ length: 7 }, (_, i) => fetchGamesForDateBDL(addDays(weekStart, i)));
        const days = await Promise.all(pulls);
        const flat = days.flat();

        const probs = {};
        await Promise.all(
          flat.map(async g => {
            try {
              const p = await getWinProbabilityForGame(g);
              probs[`${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`] = p;
            } catch {}
          })
        );

        const withP = flat
          .map(g => {
            const k = `${dateKey(new Date(g.kickoff))}|${g.away}@${g.home}`;
            const p = probs[k];
            return { ...g, _p: p ? p.home : null, _note: p?.note };
          })
          .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

        if (!cancelled) setGames(withP);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtPct = (p) => `${(p * 100).toFixed(1)}%`;

  const highlights = useMemo(() => {
    const g = games.filter(x => typeof x._p === "number");
    if (!g.length) return null;
    const fav  = [...g].sort((a, b) => b._p - a._p)[0];
    const dog  = [...g].sort((a, b) => a._p - b._p)[0];
    const coin = [...g].sort((a, b) => Math.abs(0.5 - a._p) - Math.abs(0.5 - b._p))[0];
    return { fav, dog, coin };
  }, [games]);

  // Human-readable paragraphs for the article body
  const articleParas = useMemo(() => {
    if (!games.length) return [];
    const total = games.length;
    const withProb = games.filter(g => typeof g._p === "number");
    const med = withProb.length ? (withProb.reduce((s, g) => s + g._p, 0) / withProb.length) : null;

    const open = `This week features ${total} NFL matchups. The SnappCount blend (70% market, 30% season model) leans ${
      med != null ? (med > 0.5 ? "slightly toward home teams overall" : "slightly toward road teams overall") : "on recent form where markets are unavailable"
    }, and highlights a few notable edges and potential coin-flips.`;

    const favLine = highlights?.fav
      ? `${highlights.fav.home} enter as the biggest favorite at ${fmtPct(highlights.fav._p)} over ${highlights.fav.away}.`
      : null;

    const dogLine = highlights?.dog
      ? `${highlights.dog.away} face the steepest road as underdogs; home probability for ${highlights.dog.home} is ${fmtPct(highlights.dog._p)}.`
      : null;

    const coinLine = highlights?.coin
      ? `The closest toss-up appears to be ${highlights.coin.away} @ ${highlights.coin.home}, hovering near ${fmtPct(highlights.coin._p)} for the home side.`
      : null;

    const mid = [favLine, dogLine, coinLine].filter(Boolean).join(" ");
    const closing = `Numbers shift as markets move and new results arrive. Treat the edges as directional rather than guarantees.`;

    return [open, mid, closing].filter(Boolean);
  }, [games, highlights]);

  const hasContent = !loading && games.length > 0;

  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p:{ xs:1.25, sm:2 } }}>
          {/* Title + timestamp */}
          <Stack direction={{ xs:"column", sm:"row" }} justifyContent="space-between" alignItems={{ xs:"flex-start", sm:"center" }} sx={{ mb: 1 }}>
            <Typography variant="h4" sx={{ letterSpacing: 0.5 }}>Week Preview — Article</Typography>
            <Typography variant="caption" sx={{ opacity:.75 }}>Published: {pubStamp}</Typography>
          </Stack>
          <Typography variant="caption" sx={{ display:"block", opacity:.8 }}>
            Blended probabilities (70% market, 30% season model).
          </Typography>

          <Divider sx={{ mb:{ xs:1.25, sm:2 } }} />

          {/* Loading / empty */}
          {loading ? (
            <LinearProgress />
          ) : !games.length ? (
            <Typography>No scheduled games found for this week.</Typography>
          ) : (
            <>
              {/* Article body */}
              <Stack spacing={1.5} sx={{ mb:2 }}>
                {articleParas.map((t, i) => (
                  <Typography key={i} sx={{ opacity:.95, lineHeight:1.6 }}>{t}</Typography>
                ))}
              </Stack>

              {/* Callout grid for the three highlights (if available) */}
              {highlights && (
                <>
                  <Typography variant="h6" sx={{ mb:1 }}>Spotlight Games</Typography>
                  <Grid container spacing={1.25} sx={{ mb:2 }}>
                    {[
                      { key:"fav",  title:"Biggest Favorite",    node:highlights.fav,  color:"success" },
                      { key:"dog",  title:"Biggest Underdog",    node:highlights.dog,  color:"warning" },
                      { key:"coin", title:"Closest to Coin-Flip",node:highlights.coin, color:"default" },
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
                </>
              )}

              {/* All games list (compact) */}
              <Typography variant="h6" sx={{ mb:1 }}>All Matchups (Quick View)</Typography>
              <Stack spacing={1}>
                {games.map((g, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ opacity:.95 }}>
                    <Chip size="small" label={new Date(g.kickoff).toLocaleString()} />
                    <Typography sx={{ fontWeight:700 }}>{g.away} @ {g.home}</Typography>
                    {typeof g._p === "number" && (
                      <Typography variant="caption" sx={{ ml:"auto", fontWeight:700 }}>
                        Home {fmtPct(g._p)}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>

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
