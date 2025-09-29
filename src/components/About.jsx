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
              SNAPPCOUNT estimates the home team’s win chance using a blend of market odds and a season model:
            </Typography>

            <Typography component="div" sx={{ pl: 2, mb: 1 }}>
              <ul style={{ margin: 0, paddingLeft: "1em" }}>
                <li>
                  <strong>Market (BDL Pro moneylines)</strong>: Convert American odds to implied probabilities,
                  remove the bookmaker’s vig by normalizing home/away, and use this as the market prior.
                </li>
                <li>
                  <strong>Season model (all finals this season)</strong>: For every completed game this season,
                  fit per-team <em>Offense</em> and <em>Defense</em> ratings via SGD on points with recency weighting
                  (newer weeks count more), and learn <em>Home-Field Advantage</em> from the data.
                </li>
                <li>
                  <strong>Prediction</strong>: Expected margin = (Home Off − Away Def) − (Away Off − Home Def) + HFA.
                  Convert margin → win probability with a logistic curve using a σ calibrated from margin RMSE.
                </li>
                <li>
                  <strong>Blend</strong>: Final win prob = 70% Market + 30% Season Model (if both are available).
                </li>
              </ul>
            </Typography>

            <Typography component="div" sx={{ pl: 2, mb: 1 }}>
              <ul style={{ margin: 0, paddingLeft: "1em" }}>
                <li>
                  <strong>Data sources</strong>: BallDon’tLie NFL endpoints (<code>/games</code> for season finals & live scores; Pro odds for moneylines).
                  Team codes are canonicalized (e.g., <code>JAC→JAX</code>, <code>WAS→WSH</code>).
                </li>
                <li>
                  <strong>Recency</strong>: Later weeks get higher weight (exponential decay) when fitting ratings.
                </li>
                <li>
                  <strong>Fallbacks</strong>: If odds are unavailable, use season model only; if the season has no finals yet,
                  fall back to a small home edge until results arrive.
                </li>
              </ul>
            </Typography>

            <Typography sx={{ mb: 1 }}>
              For games that are <strong>Final</strong>, the drawer also shows a verdict:
              <em>Model: Correct</em> or <em>Model: Upset</em>, based on whether the model’s pick (with its confidence)
              matched the actual winner.
            </Typography>

            <Typography sx={{ opacity: .8 }}>
              The note beneath the progress bar summarizes what drove the number (e.g., week span, sample size, learned HFA, σ),
              or indicates if the estimate fell back to market-only or home-edge-only.
            </Typography>
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
}
