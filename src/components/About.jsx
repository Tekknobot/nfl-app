import React from "react";
import { Box, Stack, Typography, Card, CardContent, Divider } from "@mui/material";

export default function About() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Stack gap={2}>
        <Card sx={{ backgroundColor: "background.paper", border:1, borderColor:"rgba(255,255,255,.08)" }}>
          <CardContent>
            <Typography variant="h4" sx={{ mb: 1, letterSpacing: 1 }}>
              SNAPPCOUNT
            </Typography>
            <Typography sx={{ opacity: .9 }}>
              SNAPPCOUNT is a lightweight NFL schedule & matchup viewer. Browse games by week, tap a matchup,
              and see a quick, transparent estimate of the home team’s win probability based on recent results.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: "background.paper", border:1, borderColor:"rgba(255,255,255,.08)" }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1 }}>Privacy & Data</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography sx={{ mb: 1 }}>
              • The developer does <strong>not</strong> collect, store, sell, or share personal data.
            </Typography>
            <Typography sx={{ mb: 1 }}>
              • The app fetches public NFL info from BallDon’tLie NFL. Requests go directly from your browser to the provider.
            </Typography>
            <Typography sx={{ opacity: .8 }}>
              • Any API keys you add are used only to call the provider and aren’t stored by the developer.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: "background.paper", border:1, borderColor:"rgba(255,255,255,.08)" }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1 }}>How the Win Probability Works</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography sx={{ mb: 1 }}>
              SNAPPCOUNT computes a simple estimate for the home team’s win chance using past completed games:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul style={{ margin: 0, paddingLeft: "1em" }}>
                <li>Pull recent finals from current & previous season (BallDon’tLie /games, free tier).</li>
                <li>Compute team averages: points per game (PPG) and points allowed (OPPG).</li>
                <li>Expected margin ≈ (Home PPG − Away OPPG) − (Away PPG − Home OPPG) + ~2 pts home edge.</li>
                <li>Convert margin → probability with a logistic curve (~7 pts ≈ 70%).</li>
              </ul>
            </Typography>
            <Typography sx={{ opacity: .8 }}>
              If no recent finals exist yet, it falls back to a small home field edge until results arrive.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
