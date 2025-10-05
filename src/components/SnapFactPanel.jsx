import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";

// NFL Snap Facts — short, rotating fun text snippets for persistent content
export default function SnapFactPanel() {
  const facts = [
    "The average NFL game has about 154 plays — and every one can swing a season.",
    "NFL teams travel nearly 25,000 miles per season on average.",
    "The coldest NFL game ever played hit −13°F at kickoff — the 1967 Ice Bowl.",
    "No team has repeated as Super Bowl champion since the 2004 Patriots.",
    "The first televised NFL game aired in 1939 between the Eagles and the Dodgers.",
    "NFL referees run about five miles each game — just behind the ball every snap.",
    "A football field, including end zones, covers about 1.32 acres of land.",
    "The average NFL play lasts only about 4 seconds — blink and it’s over.",
    "Teams score touchdowns on roughly one out of every five red-zone trips.",
    "NFL kickers now make over 85% of their field goals — a record high.",
    "The Super Bowl is the most-watched annual sporting event in the U.S.",
    "An NFL team’s playbook can exceed 300 pages — and that’s just the offense.",
    "The first overtime game in NFL history was played in 1958 — the 'Greatest Game Ever Played'.",
    "Some players burn more than 3,000 calories during a single NFL game.",
    "The longest field goal in NFL history is 66 yards, made by Justin Tucker in 2021.",
    "Each NFL football is made from the hide of a single cow — about 120 balls per hide.",
    "Tom Brady has thrown passes to 92 different teammates in his career.",
    "The NFL uses over 700,000 pounds of chicken wings on Super Bowl Sunday.",
    "Every NFL team’s helmet design is a registered trademark.",
    "The average NFL stadium holds about 70,000 fans — and sells out most Sundays."
  ];

  const [fact, setFact] = React.useState("");

  React.useEffect(() => {
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    setFact(randomFact);
  }, []);

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, bgcolor: "background.paper", borderColor: "rgba(255,255,255,.12)" }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          🏈 NFL Snap Fact
        </Typography>
        <Divider sx={{ mb: 1.25, opacity: 0.15 }} />
        <Typography variant="body1" sx={{ opacity: 0.95 }}>{fact}</Typography>
      </CardContent>
    </Card>
  );
}
