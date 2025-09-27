// server/index.js
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));

const app = express();
app.use(cors({ origin: true }));

const PORT = process.env.PORT || 5002;

// Optional proxy to ESPN scoreboard (dates=YYYYMMDD-YYYYMMDD)
app.get("/api/nfl/scoreboard", async (req, res) => {
  try {
    const { from, to } = req.query;
    const url = `https://site.api.espn.com/apis/v2/sports/football/nfl/scoreboard?dates=${from}-${to}`;
    const r = await fetch(url, { headers: { "User-Agent": "nfl-app/1.0", Accept: "application/json" } });
    res.status(r.status).type("application/json");
    res.send(await r.text());
  } catch (e) {
    res.status(502).json({ error: "Upstream fetch failed", detail: String(e) });
  }
});

app.listen(PORT, () => console.log(`nfl-app server on :${PORT}`));
