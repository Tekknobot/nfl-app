import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Link, useLocation } from "react-router-dom";

const NavLink = ({ to, icon: Icon, children }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Box
      component={Link}
      to={to}
      sx={{
        display: "flex", alignItems:"center", gap:1, px:1.5, py:0.75,
        textDecoration: "none", color: active ? "secondary.main" : "#fff",
        borderBottom: active ? 2 : 0, borderColor: "secondary.main",
        borderRadius: 1
      }}
    >
      <Icon fontSize="small" />
      <Typography variant="subtitle1">{children}</Typography>
    </Box>
  );
};

export default function Header(){
  return (
    <AppBar position="sticky" elevation={0} color="transparent"
      sx={{ backdropFilter:"blur(6px)", borderBottom:1, borderColor:"rgba(255,255,255,.1)" }}>
      <Toolbar sx={{ display:"flex", gap:2 }}>
        <SportsFootballIcon />
        <Typography variant="h5" sx={{ flex:1, fontWeight:600, letterSpacing:2 }}>
          NFL Schedule
        </Typography>
        <NavLink to="/weeks" icon={CalendarMonthIcon}>Weeks</NavLink>
      </Toolbar>
    </AppBar>
  );
}
