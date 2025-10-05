import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function InfoPanelNFL() {
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        borderColor: "rgba(255,255,255,.12)"
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Box sx={{ display: "flex", alignItems: "start", gap: 1.25 }}>
          <InfoOutlinedIcon sx={{ mt: "2px", opacity: 0.9 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              NFL Calendar & Matchup Helper
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              Browse the NFL schedule week by week. Tap any game to see both teams’ recent form,
              a light win-probability estimate (“Model edge”), and quick matchup notes.
              Built to be clean, mobile-friendly, and fun to explore.
            </Typography>
            <Divider sx={{ my: 1.25, opacity: 0.15 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Tip: Use the header to jump between weeks. Click a matchup to open details.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
