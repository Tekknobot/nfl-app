// src/pages/Terms.jsx
import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";

export default function Terms() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Card sx={{ backgroundColor: "background.paper", border: 1, borderColor: "rgba(255,255,255,.08)" }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 1 }}>Terms of Use</Typography>
          <Typography variant="caption" sx={{ opacity: .7, display: "block", mb: 2 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>1) Acceptance of Terms</Typography>
          <Typography sx={{ mb: 2 }}>
            By accessing or using SnappCount, you agree to these Terms of Use. If you do not agree,
            please do not use the site.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>2) Eligibility & Local Laws</Typography>
          <Typography sx={{ mb: 2 }}>
            You are responsible for complying with all applicable laws and age requirements in your
            jurisdiction. SnappCount does not solicit, promote, or facilitate gambling.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>3) Informational Use Only</Typography>
          <Typography sx={{ mb: 2 }}>
            SnappCount provides matchup context and win-probability estimates for informational and
            entertainment purposes only. It is not betting advice, a prediction market, or a guarantee of outcomes.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>4) No Warranties; Limitation of Liability</Typography>
          <Typography sx={{ mb: 2 }}>
            The site is provided “as is” without warranties of any kind. Data may be delayed, incomplete,
            or inaccurate. To the fullest extent permitted by law, the developer is not liable for any losses,
            damages, or decisions made based on this site.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>5) Third-Party Services & Data</Typography>
          <Typography sx={{ mb: 2 }}>
            Game data and odds may be sourced from third parties. Those services have their own terms and
            privacy practices. We are not responsible for third-party content or availability.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>6) Permitted Use</Typography>
          <Typography sx={{ mb: 2 }}>
            You may use the site for personal, non-commercial purposes. You agree not to misuse the site,
            attempt to disrupt it, scrape at abusive rates, reverse engineer, or violate any applicable laws.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>7) Intellectual Property</Typography>
          <Typography sx={{ mb: 2 }}>
            SnappCount branding, UI, and original content are owned by the developer. Third-party marks and
            data remain the property of their respective owners.
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>8) Changes to the Service or Terms</Typography>
          <Typography sx={{ mb: 2 }}>
            We may modify or discontinue features at any time. We may update these Terms by posting a new version
            on this page. Continued use after changes means you accept the updated Terms.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
