const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const TRACKER_COOKIE = "control_loop_visit";
const TRACKER_WINDOW_MS = 24 * 60 * 60 * 1000;
const TRACKER_LOG_FILE = path.join(__dirname, "logs", "visits.log");

function parseCookies(headerValue) {
  if (!headerValue) return {};

  return headerValue.split(";").reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return cookies;

    cookies[rawKey] = decodeURIComponent(rawValue.join("=") || "");
    return cookies;
  }, {});
}

function shouldCountVisit(req) {
  const cookies = parseCookies(req.headers.cookie);
  const lastTrackedAt = Number.parseInt(cookies[TRACKER_COOKIE], 10);

  if (!Number.isFinite(lastTrackedAt)) return true;
  return Date.now() - lastTrackedAt >= TRACKER_WINDOW_MS;
}

function setTrackerCookie(res, timestamp) {
  const maxAgeSeconds = Math.floor(TRACKER_WINDOW_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `${TRACKER_COOKIE}=${timestamp}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`
  );
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

function appendVisitLog(req, timestamp) {
  const entry = {
    at: new Date(timestamp).toISOString(),
    path: req.path,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] || "unknown",
    referrer: req.headers.referer || null,
  };

  fs.mkdirSync(path.dirname(TRACKER_LOG_FILE), { recursive: true });
  fs.appendFileSync(TRACKER_LOG_FILE, `${JSON.stringify(entry)}\n`);
  console.log("[visit]", entry);
}

function trackVisit(req, res) {
  const now = Date.now();

  if (shouldCountVisit(req)) {
    appendVisitLog(req, now);
  }

  setTrackerCookie(res, now);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  trackVisit(req, res);
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/about", (req, res) => {
  trackVisit(req, res);
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/demo", (req, res) => {
  trackVisit(req, res);
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (_req, res) => {
  res.redirect(302, "/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Control Loop running at http://localhost:${PORT}`);
});
