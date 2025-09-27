import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Header from "./components/Header";
import AllGamesCalendarNFL from "./components/AllGamesCalendarNFL";
import About from "./components/About";

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
      <BrowserRouter>
        <Header />
        <Box sx={{ p:2 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/weeks" replace />} />
            <Route path="/weeks" element={<AllGamesCalendarNFL />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/weeks" replace />} />
          </Routes>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}
