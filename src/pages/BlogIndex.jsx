import React from "react";
import {
  Box, Card, CardContent, Typography, Divider, Stack, Button, Chip
} from "@mui/material";
import { Link } from "react-router-dom";
import ArticleIcon from "@mui/icons-material/Article";
import TimelineIcon from "@mui/icons-material/Timeline";
import ReplayIcon from "@mui/icons-material/Replay";

export default function BlogIndex(){
  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined" sx={{ overflow: "hidden" }}>
        <CardContent sx={{ p:{ xs:1.5, sm:2 } }}>
          <Stack
            direction={{ xs:"column", sm:"row" }}
            justifyContent="space-between"
            alignItems={{ xs:"flex-start", sm:"center" }}
            sx={{ mb: 1 }}
          >
            <Typography variant="h4" sx={{ letterSpacing:.3 }}>SnappCount Blog</Typography>
            <Chip size="small" label="Weekly updates" />
          </Stack>

          <Typography sx={{ opacity:.85, mb:2, lineHeight:1.6 }}>
            Weekly previews, recaps, and model notes — generated from live schedules and our blended probability model.
          </Typography>

          <Divider sx={{ mb:2 }} />

          {/* CTA row — full width on mobile, tidy row on desktop */}
          <Stack
            direction={{ xs:"column", md:"row" }}
            spacing={1}
            useFlexGap
            sx={{
              "& .MuiButton-root": {
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600
              }
            }}
          >
            <Button
              component={Link}
              to="/blog/week/preview"
              variant="contained"
              startIcon={<TimelineIcon />}
              fullWidth
              sx={{ py:1.1 }}
            >
              This Week’s Preview
            </Button>

            <Button
              component={Link}
              to="/blog/week/recap"
              variant="outlined"
              startIcon={<ReplayIcon />}
              fullWidth
              sx={{ py:1.1 }}
            >
              Last Week’s Recap
            </Button>

            <Button
              component={Link}
              to="/blog/week/preview/article"
              variant="text"
              startIcon={<ArticleIcon />}
              fullWidth
              sx={{
                py:1.1,
                border: "1px dashed rgba(255,255,255,.18)",
                "&:hover": { borderStyle: "solid" }
              }}
            >
              Weekly Preview (Article)
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
