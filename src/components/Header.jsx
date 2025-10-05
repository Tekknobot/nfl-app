import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { Link as RouterLink, NavLink as RouterNavLink } from "react-router-dom";

const NavItem = ({ to, icon: Icon, children }) => {
  return (
    <RouterNavLink
      to={to}
      style={{ textDecoration: "none" }}
      className={({ isActive }) => (isActive ? "active" : undefined)}
    >
      {({ isActive }) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            color: isActive ? "secondary.main" : "#fff",
            borderBottom: isActive ? 2 : 0,
            borderColor: "secondary.main",
            borderRadius: 1
          }}
        >
          <Icon fontSize="small" />
          <Typography variant="subtitle1">{children}</Typography>
        </Box>
      )}
    </RouterNavLink>
  );
};

export default function Header() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{ backdropFilter: "blur(6px)", borderBottom: 1, borderColor: "rgba(255,255,255,.1)" }}
    >
      <Toolbar sx={{ display: "flex", gap: 2, minHeight: { xs: 56, sm: 64 } }}>
        {/* Brand (clickable) */}
        <Box
          component={RouterLink}
          to="/"
          aria-label="SNP.COUNT home"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "inherit",
            textDecoration: "none",
            mr: 1
          }}
        >
          <SportsFootballIcon />
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Bebas Neue","Oswald",sans-serif',
              fontWeight: 700,
              letterSpacing: 0.5,
              lineHeight: 1,
              flex: 1,
              mr: 1
            }}
          >
            
          </Typography>
        </Box>

        {/* Spacer to push nav right on small screens */}
        <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />

        {/* Nav */}
        <NavItem to="/weeks" icon={CalendarMonthIcon}>Weeks</NavItem>
        <NavItem to="/about" icon={InfoOutlinedIcon}>About</NavItem>
        <NavItem to="/contact" icon={MailOutlineIcon}>Contact</NavItem>
      </Toolbar>
    </AppBar>
  );
}
