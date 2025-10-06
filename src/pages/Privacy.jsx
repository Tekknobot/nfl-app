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
            This page explains what information SnappCount processes and why. The service is operated by an independent developer.
          </Typography>

          <Divider sx={{ mb:2 }} />
          <Typography variant="h6" sx={{ mb:1 }}>Information Collected</Typography>
          <Typography sx={{ mb:2 }}>
            SnappCount does not require user accounts and does not directly collect personal information.
            Standard web logs (such as IP address and user-agent) may be processed by hosting providers for security and reliability.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Cookies & Advertising</Typography>
          <Typography sx={{ mb:2 }}>
            SnappCount uses Google AdSense to display advertising. Google and its partners may use cookies or similar
            technologies to serve and measure ads and to personalize ad experiences. Ad personalization can be managed
            in browser or device settings, and by clearing cookies. For more details about advertising cookies, refer to Google’s publicly available documentation.
          </Typography>

          <Typography sx={{ mb:2 }}>
            Where required by local law, a consent banner is presented so visitors can manage cookie and advertising preferences.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Third-Party Services</Typography>
          <Typography sx={{ mb:2 }}>
            Game data is retrieved from BallDon’tLie NFL APIs. Requests are made from the user’s browser directly to that provider.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Your Choices</Typography>
          <Typography sx={{ mb:2 }}>
            Visitors can adjust ad personalization in browser/device settings, use private browsing modes, or clear cookies at any time.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Contact</Typography>
          <Typography sx={{ mb:0 }}>
            Questions about this policy can be directed using the details on the Contact page.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
