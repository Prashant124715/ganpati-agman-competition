const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const config = require("../config/site.config");
const db = require("../db/database");
const session = require("../lib/session");
const { verifyPassword } = require("../lib/password");
const requireAdmin = require("../middleware/requireAdmin");

const PAGE_SIZE = 20;

// ---------------- Auth ----------------

router.get("/admin/login", (req, res) => {
  const existingToken = req.cookies && req.cookies.admin_session;
  if (session.verify(existingToken)) return res.redirect("/admin");
  res.render("admin-login", { pageTitle: "Admin Login", error: null, next: req.query.next || "/admin" });
});

router.post("/admin/login", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  const admin = db
    .prepare(`SELECT * FROM users WHERE email = ? AND role = 'admin'`)
    .get(email);

  if (!admin || !admin.password_hash || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).render("admin-login", {
      pageTitle: "Admin Login",
      error: "Incorrect email or password.",
      next: req.body.next || "/admin",
    });
  }

  const token = session.sign({
    role: "admin",
    email: admin.email,
    name: admin.name,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  });

  res.cookie("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12,
  });

  res.redirect(req.body.next && req.body.next.startsWith("/") ? req.body.next : "/admin");
});

router.post("/admin/logout", (req, res) => {
  res.clearCookie("admin_session");
  res.redirect("/admin/login");
});

// ---------------- Dashboard shell (server-rendered page; data loads via API) ----------------

router.get("/admin", requireAdmin, (req, res) => {
  res.render("admin-dashboard", {
    pageTitle: "Admin Dashboard",
    admin: req.admin,
    categories: config.categories,
  });
});

// ---------------- JSON API used by public/js/admin.js ----------------

router.get("/admin/api/stats", requireAdmin, (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as n FROM submissions`).get().n;
  const totalVotes = db.prepare(`SELECT COUNT(*) as n FROM votes`).get().n;

  const byCategory = config.categories.map((c) => {
    const count = db
      .prepare(`SELECT COUNT(*) as n FROM submissions WHERE category = ?`)
      .get(c.key).n;
    const votes = db
      .prepare(`SELECT COUNT(*) as n FROM votes WHERE category = ?`)
      .get(c.key).n;
    return { key: c.key, label: c.label, total: count, votes };
  });

  res.json({
    ok: true,
    totals: { total, votes: totalVotes },
    byCategory,
  });
});

router.get("/admin/api/submissions", requireAdmin, (req, res) => {
  const { category = "all", status = "all", q = "" } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const clauses = [];
  const params = [];

  if (category !== "all") {
    clauses.push("category = ?");
    params.push(category);
  }
  if (status !== "all") {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q.trim()) {
    clauses.push("(name LIKE ? OR college_id LIKE ? OR submission_code LIKE ? OR email LIKE ?)");
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) as n FROM submissions ${where}`).get(...params).n;

  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) as vote_count
       FROM submissions s ${where}
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset)
    .map((s) => ({ ...s, file_paths: JSON.parse(s.file_paths) }));

  res.json({
    ok: true,
    submissions: rows,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  });
});

router.delete("/admin/api/submissions/:id", requireAdmin, (req, res) => {
  const submission = db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(req.params.id);
  if (!submission) return res.status(404).json({ ok: false, error: "Not found." });

  const files = JSON.parse(submission.file_paths || "[]");
  for (const f of files) {
    // f.path looks like "/uploads/<category>/<filename>"; the uploads/
    // folder lives at the project root (see server.js static mount).
    const abs = path.join(__dirname, "..", f.path);
    fs.unlink(abs, () => {}); // best-effort; missing files are not fatal
  }

  db.prepare(`DELETE FROM submissions WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

router.patch("/admin/api/submissions/:id", requireAdmin, (req, res) => {
  const { name, college_id, email, title, description } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim() || !title || !title.trim()) {
    return res.status(400).json({ ok: false, error: "Name, email, and title are required." });
  }

  const cleanCollegeId = (college_id || "").trim() || "N/A";

  const result = db
    .prepare(
      `UPDATE submissions
       SET name = ?, college_id = ?, email = ?, title = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      name.trim(),
      cleanCollegeId,
      email.trim().toLowerCase(),
      title.trim(),
      (description || "").trim(),
      req.params.id
    );

  if (result.changes === 0) return res.status(404).json({ ok: false, error: "Submission not found." });
  res.json({ ok: true });
});

router.get("/admin/api/dev-outbox", requireAdmin, (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM dev_mail_outbox ORDER BY id DESC LIMIT 50`)
    .all();
  res.json({ ok: true, mails: rows });
});

// ---------------- CSV export ----------------

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get("/admin/export.csv", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) as vote_count
       FROM submissions s ORDER BY s.created_at ASC`
    )
    .all();

  const header = [
    "submission_code",
    "category",
    "name",
    "college_id",
    "email",
    "title",
    "description",
    "vote_count",
    "created_at",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      header.map((h) => csvEscape(r[h])).join(",")
    );
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ganpati-agman-submissions-${Date.now()}.csv"`
  );
  res.send(lines.join("\n"));
});

module.exports = router;
