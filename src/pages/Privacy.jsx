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

          <Typography variant="h6" sx={{ mb:1 }}>Cookies & Tracking</Typography>
          <Typography sx={{ mb:2 }}>
            SnappCount does <strong>not</strong> display advertising and does <strong>not</strong> use advertising cookies.
            The site aims to operate with minimal cookies. Any cookies present are limited to essential functionality (for example,
            basic preferences) and are not used to track users across sites.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Third-Party Services</Typography>
          <Typography sx={{ mb:2 }}>
            Game data is retrieved from BallDon’tLie NFL APIs. Requests are made from the user’s browser directly to that provider.
            Please review that provider’s documentation and policies for details about their data handling.
          </Typography>

          <Typography variant="h6" sx={{ mb:1 }}>Your Choices</Typography>
          <Typography sx={{ mb:2 }}>
            Visitors can use private browsing modes and clear cookies at any time through their browser settings.
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
