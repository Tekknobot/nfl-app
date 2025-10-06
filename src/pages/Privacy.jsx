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
            We use Google AdSense to show ads. Google and its partners may use cookies and similar
            technologies to serve and measure ads. These technologies may personalize ads based on your visits to
            this and other sites. You can learn more about how Google uses data and manage choices at
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer"> Google’s Ads page</a>.
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
            You can adjust ad personalization at Google’s Ad Settings, clear cookies, or use private browsing.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Contact</Typography>
          <Typography>
            Questions? Email us at <a href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
