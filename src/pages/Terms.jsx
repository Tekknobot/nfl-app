import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";

export default function Terms() {
  return (
    <Box sx={{ maxWidth: 900, mx:"auto", p:{ xs:1, sm:2 } }}>
      <Card sx={{ backgroundColor:"background.paper", border:1, borderColor:"rgba(255,255,255,.08)" }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb:1 }}>Terms of Use</Typography>
          <Divider sx={{ mb:2 }} />
          <Typography sx={{ mb:1 }}>
            SnappCount is provided “as is” for informational and entertainment purposes only.
            No warranties; no liability for decisions made based on this site.
          </Typography>
          <Typography sx={{ mb:1 }}>
            You agree to comply with applicable laws. We may update these terms at any time by posting a new version.
          </Typography>
          <Typography sx={{ opacity:.85 }}>
            Contact: <a href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
