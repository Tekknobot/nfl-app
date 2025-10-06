// src/pages/Privacy.jsx
import React from "react";
import { Box, Card, CardContent, Divider, Typography } from "@mui/material";

export default function Privacy() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs:1, sm:2 } }}>
      <Card sx={{ backgroundColor:"background.paper", border:1, borderColor:"rgba(255,255,255,.08)" }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb:1 }}>Privacy Policy</Typography>
          <Typography variant="caption" sx={{ opacity:.7, display:"block", mb:2 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography sx={{ mb:2 }}>
            SnappCount (“we”) respects your privacy. This page explains what data we process and why.
          </Typography>

          <Divider sx={{ mb:2 }} />
          <Typography variant="h6" sx={{ mb:1 }}>Information We Collect</Typography>
          <Typography sx={{ mb:2 }}>
            We don’t require accounts and we don’t directly collect personal information.
            Standard web logs (IP address, user-agent) may be processed by our hosting provider for
            security and reliability.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Cookies & Advertising</Typography>
          <Typography sx={{ mb:2 }}>
            We use Google AdSense to show ads. Google and its partners may use cookies or similar
            technologies to serve and measure ads and to personalize ad experiences. You can manage
            ad personalization in your browser or device settings and by clearing cookies. For details
            about how advertising cookies work, consult Google’s publicly available documentation.
          </Typography>

          <Typography sx={{ mb:2 }}>
            In regions where required, we display a consent banner so you can manage cookie and advertising preferences.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Third-Party Services</Typography>
          <Typography sx={{ mb:2 }}>
            Our game data comes from BallDon’tLie NFL APIs. Requests are made from your browser to that provider.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Your Choices</Typography>
          <Typography sx={{ mb:2 }}>
            You can adjust ad personalization in your browser or device settings, use private browsing,
            or clear cookies at any time.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Contact</Typography>
          <Typography sx={{ mb:0 }}>
            Questions about this policy? See the Contact page for how to reach us.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
