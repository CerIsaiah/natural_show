const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/about", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/demo", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (_req, res) => {
  res.redirect(302, "/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Control Loop running at http://localhost:${PORT}`);
});
