const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const router = express.Router();
const config = require("../config/site.config");
const db = require("../db/database");
const { submissionUpload, getCategory } = require("../lib/upload");
const requireAdmin = require("../middleware/requireAdmin");

function generateSubmissionCode() {
  const year = new Date().getFullYear().toString().slice(-2);
  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    const code = `GA${year}-${rand}`;
    const exists = db.prepare(`SELECT 1 FROM submissions WHERE submission_code = ?`).get(code);
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique submission code, please try again.");
}

// Category chooser for admin entry creation
router.get("/admin/entries/new", requireAdmin, (req, res) => {
  res.render("admin-entry-choose", {
    pageTitle: "Add Entry — Select Category",
    admin: req.admin,
    categories: config.categories,
  });
});

// Category entry creation form for admin
router.get("/admin/entries/new/:categoryKey", requireAdmin, (req, res) => {
  const category = getCategory(req.params.categoryKey);
  if (!category) {
    return res.status(404).render("error", {
      title: "Unknown category",
      message: "That competition category does not exist.",
    });
  }

  res.render("admin-entry-form", {
    pageTitle: `Add Entry — ${category.label}`,
    admin: req.admin,
    category,
    errors: [],
    values: {},
    duplicateWarning: null,
    existingCode: null,
  });
});

// Process entry creation by admin
router.post("/admin/entries/new/:categoryKey", requireAdmin, submissionUpload, (req, res) => {
  const category = getCategory(req.params.categoryKey);
  if (!category) {
    return res.status(404).render("error", {
      title: "Unknown category",
      message: "That competition category does not exist.",
    });
  }

  const rerender = (errors, duplicateWarning = null, existingCode = null) => {
    if (req.files && req.files.length) {
      for (const f of req.files) fs.unlink(f.path, () => {});
    }
    return res.status(400).render("admin-entry-form", {
      pageTitle: `Add Entry — ${category.label}`,
      admin: req.admin,
      category,
      errors,
      values: req.body,
      duplicateWarning,
      existingCode,
    });
  };

  const { name, collegeId, email, title, description, force, facultyConfirm } = req.body;
  const errors = [];
  const cleanCollegeId = (collegeId || "").trim() || "N/A";

  if (!name || !name.trim()) errors.push("Participant full name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email address is required.");
  }
  if (
    config.allowedEmailDomain &&
    email &&
    !email.toLowerCase().endsWith(config.allowedEmailDomain.toLowerCase())
  ) {
    errors.push(`Please use official college email (${config.allowedEmailDomain}).`);
  }
  if (!title || !title.trim()) errors.push("Entry title is required.");
  if (category.audience === "faculty-only" && facultyConfirm !== "on") {
    errors.push("Please confirm the participant is a faculty member for Faculty Corner.");
  }
  if (req.uploadError) errors.push(req.uploadError);
  if (!req.uploadError && (!req.files || req.files.length === 0)) {
    errors.push("Please upload entry file(s).");
  }

  if (errors.length) return rerender(errors);

  const cleanEmail = email.trim().toLowerCase();

  // Duplicate check: if email + category exists and force !== "1", warn first
  const existing = db
    .prepare(`SELECT submission_code FROM submissions WHERE email = ? AND category = ?`)
    .get(cleanEmail, category.key);

  if (existing && force !== "1") {
    return rerender(
      [],
      `This email already has an entry in this category (submission code ${existing.submission_code}). Add anyway?`,
      existing.submission_code
    );
  }

  try {
    let user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(cleanEmail);
    if (!user) {
      const info = db
        .prepare(
          `INSERT INTO users (name, college_id, email, role, is_verified) VALUES (?, ?, ?, 'participant', 1)`
        )
        .run(name.trim(), cleanCollegeId, cleanEmail);
      user = { id: info.lastInsertRowid };
    }

    const filePaths = req.files.map((f) => ({
      path: `/uploads/${category.key}/${f.filename}`,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));

    const code = generateSubmissionCode();

    db.prepare(
      `INSERT INTO submissions
        (submission_code, user_id, name, college_id, email, category, title, description, file_paths, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
    ).run(
      code,
      user.id,
      name.trim(),
      cleanCollegeId,
      cleanEmail,
      category.key,
      title.trim(),
      (description || "").trim(),
      JSON.stringify(filePaths)
    );

    res.redirect(`/admin?added=${code}`);
  } catch (err) {
    console.error("Admin entry creation error:", err);
    rerender(["Something went wrong saving the entry. Please try again."]);
  }
});

module.exports = router;
