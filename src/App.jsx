import React from "react";
import { HashRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme, Typography } from "@mui/material";
import Header from "./components/Header";
import AllGamesCalendarNFL from "./components/AllGamesCalendarNFL";
import BlogIndex from "./pages/BlogIndex";
import WeekPreview from "./pages/WeekPreview";
import WeekRecap from "./pages/WeekRecap";
import About from "./components/About";
import Contact from "./components/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#0b6b3a" },
    secondary: { main: "#ffd54f" },
    background: { default: "#062b18", paper: "#0b3d24" }
  },
  typography: {
    fontFamily: ["Oswald","Roboto","Helvetica","Arial","sans-serif"].join(","),
    h4: { letterSpacing: 1 }
  },
  shape: { borderRadius: 14 }
});

export default function App(){
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Router>
        <Header />

        {/* Main content */}
        <Box component="main" sx={{ p:2, minHeight: "calc(100vh - 160px)" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/weeks" replace />} />
            <Route path="/weeks" element={<AllGamesCalendarNFL />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/week/preview" element={<WeekPreview />} />
            <Route path="/blog/week/recap" element={<WeekRecap />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/weeks" replace />} />
          </Routes>
        </Box>

        {/* Footer */}
        <Box component="footer" sx={{ px:2, py:3, textAlign:"center", opacity:0.9 }}>
          <Typography
            variant="body2"
            sx={{ "& a": { color:"inherit", textDecoration:"underline", textUnderlineOffset: "2px" }, display:"inline-flex", gap:1 }}
          >
            <Link to="/about">About</Link> ·
            <Link to="/privacy">Privacy</Link> ·
            <Link to="/contact">Contact</Link> ·
            <Link to="/terms">Terms</Link> ·
            <Link to="/blog">Blog</Link>
          </Typography>
          <Typography variant="caption" sx={{ display:"block", mt:.5, opacity:.7 }}>
            © {new Date().getFullYear()} SnappCount
          </Typography>
        </Box>
      </Router>
    </ThemeProvider>
  );
}
