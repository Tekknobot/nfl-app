// src/components/Header.jsx
import React from "react";
import {
  AppBar, Toolbar, Box, Typography, IconButton, Drawer,
  List, ListItemButton, ListItemText, Divider
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import { Link as RouterLink, NavLink as RouterNavLink, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/weeks",   label: "Weeks" },
  { to: "/blog",    label: "Blog" },
  { to: "/about",   label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms",   label: "Terms" }
];

const NavItemInline = ({ to, children }) => (
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
          px: 1.25,
          py: 0.75,
          color: isActive ? "secondary.main" : "#fff",
          borderBottom: isActive ? 2 : 0,
          borderColor: "secondary.main",
          borderRadius: 1,
          transition: "color .15s ease, border-color .15s ease",
          "&:hover": { color: "secondary.light" }
        }}
      >
        <Typography variant="subtitle2" sx={{ letterSpacing: .2 }}>
          {children}
        </Typography>
      </Box>
    )}
  </RouterNavLink>
);

export default function Header() {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();
  const toggle = (v) => () => setOpen(v);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: "blur(6px)",
          borderBottom: 1,
          borderColor: "rgba(255,255,255,.1)"
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          {/* Brand */}
          <Box
            component={RouterLink}
            to="/"
            aria-label="SnappCount home"
            sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "inherit", textDecoration: "none" }}
          >
            <SportsFootballIcon />
            {/* Hide text on tiny screens to save space */}
            <Typography variant="subtitle1" sx={{ display: { xs: "none", sm: "inline" }, letterSpacing: 1 }}>
              SnappCount
            </Typography>
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Desktop / tablet inline nav */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
            {LINKS.map((l) => (
              <NavItemInline key={l.to} to={l.to}>{l.label}</NavItemInline>
            ))}
          </Box>

          {/* Mobile menu button */}
          <IconButton
            aria-label="Open navigation"
            onClick={toggle(true)}
            sx={{ display: { xs: "inline-flex", md: "none" }, ml: 0.5 }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={open} onClose={toggle(false)}>
        <Box
          role="presentation"
          sx={{ width: 280, p: 1 }}
          onClick={toggle(false)}
          onKeyDown={toggle(false)}
        >
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography variant="subtitle1" sx={{ letterSpacing: .5 }}>
              Menu
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List>
            {LINKS.map(({ to, label }) => {
              const active = pathname === to;
              return (
                <ListItemButton
                  key={to}
                  component={RouterLink}
                  to={to}
                  selected={active}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.08)" }
                  }}
                >
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      letterSpacing: .2
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
