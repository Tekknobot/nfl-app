import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme, Typography } from "@mui/material";
import Header from "./components/Header";
import AllGamesCalendarNFL from "./components/AllGamesCalendarNFL";
import BlogIndex from "./pages/BlogIndex";
import WeekPreview from "./pages/WeekPreview";
import WeekPreviewPost from "./pages/WeekPreviewPost";
import WeekRecap from "./pages/WeekRecap";
import About from "./components/About";
import Contact from "./components/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { Analytics } from "@vercel/analytics/react";
import { UseRouteAnalytics } from "./analyticsRouteChange"; // ✅ add this

const theme = createTheme({ /* ...your theme as-is... */ });

export default function App(){
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />
        <UseRouteAnalytics /> {/* ✅ now properly imported */}

        <Box component="main" sx={{ p:2, minHeight: "calc(100vh - 160px)" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/weeks" replace />} />
            <Route path="/weeks" element={<AllGamesCalendarNFL />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/week/preview" element={<WeekPreview />} />
            <Route path="/blog/week/preview/article" element={<WeekPreviewPost />} />
            <Route path="/blog/week/recap" element={<WeekRecap />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/weeks" replace />} />
          </Routes>
        </Box>

        <Box component="footer" sx={{ px:2, py:3, textAlign:"center", opacity:0.9 }}>
          {/* ...footer unchanged... */}
        </Box>

        <Analytics />
      </Router>
    </ThemeProvider>
  );
}
