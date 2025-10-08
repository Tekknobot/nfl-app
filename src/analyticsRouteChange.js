// src/analyticsRouteChange.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@vercel/analytics";

export function UseRouteAnalytics() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    track("pageview", { path: pathname + search });
  }, [pathname, search]);
  return null;
}
