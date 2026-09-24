require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
require("./db/database"); // ensures schema exists before anything else runs

const config = require("./config/site.config");
const session = require("./lib/session");
const pagesRouter = require("./routes/pages");
const adminEntriesRouter = require("./routes/adminEntries");
const voteRouter = require("./routes/vote");
const adminRouter = require("./routes/admin");

// Auto-seed or update admin credentials if configured in environment
function seedAdminIfConfigured() {
  const name = process.env.ADMIN_NAME;
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const passwordPlain = process.env.ADMIN_PASSWORD;
  if (!name || !email || !passwordPlain) return;

  try {
    const { hashPassword } = require("./lib/password");
    const db = require("./db/database");
    const passwordHash = hashPassword(passwordPlain);
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      db.prepare(
        "UPDATE users SET name = ?, role = 'admin', password_hash = ?, is_verified = 1 WHERE id = ?"
      ).run(name, passwordHash, existing.id);
    } else {
      db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_verified) VALUES (?, ?, 'admin', ?, 1)"
      ).run(name, email, passwordHash);
    }
  } catch (err) {
    console.warn("Could not auto-seed admin account:", err.message);
  }
}
seedAdminIfConfigured();

const app = express();

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Serves everything under /public directly at the root, so files at
// public/css/style.css, public/js/main.js and public/img/*.svg are
// reachable at /css/style.css, /js/main.js and /img/*.svg.
app.use(express.static(path.join(__dirname, "public")));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Uploaded participant files. These are served as plain static files so the
// browser can show images inline, stream video with range requests, and
// embed PDFs. There is nothing sensitive in this folder — submissions are
// meant to be shown publicly once approved — so no auth is required here.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make site config and admin login state available to every view
app.use((req, res, next) => {
  res.locals.site = config;
  res.locals.currentPath = req.path;
  const adminPayload = session.verify(req.cookies && req.cookies.admin_session);
  res.locals.isAdminLoggedIn = Boolean(adminPayload && adminPayload.role === "admin");
  next();
});

app.use(pagesRouter);
app.use(adminEntriesRouter);
app.use(voteRouter);
app.use(adminRouter);

app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Page not found",
    title: "Page not found",
    message: "The page you're looking for doesn't exist.",
  });
});

// Centralized error handler — always shows a friendly page, never a raw
// stack trace, to satisfy the "no technical error messages" requirement.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    pageTitle: "Something went wrong",
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again in a moment.",
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ganpati Agman site running at http://localhost:${PORT}`);
    if (!process.env.SMTP_HOST) {
      console.log("SMTP is not configured — running in DEV MAIL MODE (OTP codes are logged here).");
    }
  });
}

module.exports = app;
