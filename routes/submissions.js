const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const config = require("../config/site.config");
const db = require("../db/database");
const { submissionUpload, getCategory } = require("../lib/upload");

function generateSubmissionCode() {
  // e.g. GA26-8F3K1Q — short, unique, easy to quote in an email/support ticket.
  const year = new Date().getFullYear().toString().slice(-2);
  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    const code = `GA${year}-${rand}`;
    const exists = db.prepare(`SELECT 1 FROM submissions WHERE submission_code = ?`).get(code);
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique submission code, please try again.");
}

function isPastDeadline() {
  return Date.now() > new Date(config.submissionDeadline).getTime();
}

router.get("/submit", (req, res) => {
  res.render("submit-choose", {
    pageTitle: "Submit Your Entry",
    pastDeadline: isPastDeadline(),
  });
});

router.get("/submit/:categoryKey", (req, res) => {
  const category = getCategory(req.params.categoryKey);
  if (!category) {
    return res.status(404).render("error", {
      title: "Unknown category",
      message: "That competition category does not exist.",
    });
  }

  res.render("submit-form", {
    pageTitle: `Submit — ${category.label}`,
    category,
    pastDeadline: isPastDeadline(),
    errors: [],
    values: {},
  });
});

router.post("/submit/:categoryKey", submissionUpload, (req, res) => {
  const category = getCategory(req.params.categoryKey);
  if (!category) {
    return res.status(404).render("error", {
      title: "Unknown category",
      message: "That competition category does not exist.",
    });
  }

  const rerender = (errors) =>
    res.status(400).render("submit-form", {
      pageTitle: `Submit — ${category.label}`,
      category,
      pastDeadline: isPastDeadline(),
      errors,
      values: req.body,
    });

  if (isPastDeadline()) {
    return rerender(["The submission deadline for this competition has passed."]);
  }

  const errors = [];
  const { name, collegeId, email, title, description } = req.body;
  const agreed = req.body.agree === "on" || req.body.agree === "true";

  if (!name || !name.trim()) errors.push("Full name is required.");
  if (!collegeId || !collegeId.trim())
    errors.push(
      category.audience === "faculty-only"
        ? "Employee / Faculty ID is required."
        : "College ID is required."
    );
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("A valid college email address is required.");
  if (
    config.allowedEmailDomain &&
    email &&
    !email.toLowerCase().endsWith(config.allowedEmailDomain.toLowerCase())
  ) {
    errors.push(`Please use your official college email address (${config.allowedEmailDomain}).`);
  }
  if (!title || !title.trim()) errors.push("Entry title is required.");
  if (!agreed) errors.push("You must agree to the declaration to submit your entry.");
  if (category.audience === "faculty-only" && req.body.facultyConfirm !== "on") {
    errors.push("Please confirm you are a faculty member to submit to Faculty Corner.");
  }
  if (req.uploadError) errors.push(req.uploadError);
  if (!req.uploadError && (!req.files || req.files.length === 0)) {
    errors.push("Please upload your work.");
  }

  if (errors.length) {
    // Clean up any files multer already saved before validation failed,
    // so rejected attempts don't leave orphaned uploads on disk.
    if (req.files && req.files.length) {
      const fs = require("fs");
      for (const f of req.files) fs.unlink(f.path, () => {});
    }
    return rerender(errors);
  }

  try {
    let user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
    if (!user) {
      const info = db
        .prepare(
          `INSERT INTO users (name, college_id, email, role, is_verified) VALUES (?, ?, ?, 'participant', 0)`
        )
        .run(name.trim(), collegeId.trim(), email.toLowerCase());
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(
      code,
      user.id,
      name.trim(),
      collegeId.trim(),
      email.toLowerCase(),
      category.key,
      title.trim(),
      (description || "").trim(),
      JSON.stringify(filePaths)
    );

    res.render("submit-success", {
      pageTitle: "Submission received",
      code,
      category,
    });
  } catch (err) {
    console.error("Submission error:", err);
    if (req.files && req.files.length) {
      const fs = require("fs");
      for (const f of req.files) fs.unlink(f.path, () => {});
    }
    rerender(["Something went wrong saving your submission. Please try again."]);
  }
});

module.exports = router;
