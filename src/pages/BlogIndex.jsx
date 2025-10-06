// src/pages/BlogIndex.jsx
import React from "react";
import { Box, Card, CardContent, Typography, Divider, Stack, Button } from "@mui/material";
import { Link } from "react-router-dom";

export default function BlogIndex(){
  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card variant="outlined" sx={{ mb:2 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb:1 }}>SnappCount Blog</Typography>
          <Typography sx={{ opacity:.85, mb:2 }}>
            Weekly previews, recaps, and model notes — auto-generated from live schedules and our season model.
          </Typography>
          <Divider sx={{ mb:2 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button component={Link} to="/blog/week/preview" variant="contained" size="small">
              This Week’s Preview
            </Button>
            <Button component={Link} to="/blog/week/recap" variant="outlined" size="small">
              Last Week’s Recap
            </Button>
            <Button component={Link} to="/blog/week/preview/article" variant="text" size="small">
              Weekly Preview (Article)
            </Button>            
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
