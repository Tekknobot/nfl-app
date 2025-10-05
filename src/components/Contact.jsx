import React from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Stack, Divider, Alert, Link as MuiLink
} from "@mui/material";

// Contact page (mailto handoff) — mirrors your style and MUI theme
export default function Contact() {
  // ✅ EDIT JUST THESE
  const LOCAL  = "zillatronics"; // before @
  const DOMAIN = "gmail";        // after @, before .
  const TLD    = "com";          // .com / .app / etc.
  const SUBJECT_PREFIX = "SnappCount"; // optional

  const enc = (s) => encodeURIComponent(s);
  const getEmail = () => `${LOCAL}@${DOMAIN}.${TLD}`;

  const [status, setStatus] = React.useState({ ok: null, msg: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef(null);

  function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus({ ok: false, msg: "Please complete all fields." });
      setSubmitting(false);
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setStatus({ ok: false, msg: "Please enter a valid email address." });
      setSubmitting(false);
      return;
    }

    const to = getEmail();
    const subject = enc(`${SUBJECT_PREFIX}: ${name}`);
    const body = enc(`Name: ${name}\nEmail: ${email}\n\n${message}`);

    try {
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      setStatus({ ok: true, msg: "Your email client should open with your message. If it didn’t, email us directly." });
      formRef.current?.reset();
    } catch {
      setStatus({ ok: false, msg: "Could not open your email client. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 640, p: 2 }}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Contact Us
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" sx={{ mb: 2 }}>
            Questions, feature requests, or bug reports? Send us a note below.
          </Typography>

          {status.ok === true && <Alert severity="success" sx={{ mb: 2 }}>{status.msg}</Alert>}
          {status.ok === false && <Alert severity="error" sx={{ mb: 2 }}>{status.msg}</Alert>}

          <form onSubmit={onSubmit} ref={formRef} noValidate>
            <Stack spacing={2}>
              <TextField label="Your Name" name="name" required fullWidth autoComplete="name" />
              <TextField label="Your Email" name="email" type="email" required fullWidth autoComplete="email" />
              <TextField label="Message" name="message" multiline rows={4} required fullWidth />
              <Button variant="contained" type="submit" disabled={submitting}>
                {submitting ? "Opening…" : "Send Message"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
