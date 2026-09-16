const express = require("express");
const router = express.Router();
const config = require("../config/site.config");
const db = require("../db/database");
const otp = require("../lib/otp");
const mailer = require("../lib/mailer");
const session = require("../lib/session");
const requireVoter = require("../middleware/requireVoter");
const { checkVoteAllowed } = require("../lib/votingRules");
const { getCategory } = require("../lib/upload");

const PAGE_SIZE = 12;

function isPastDeadline() {
  return Date.now() > new Date(config.votingDeadline).getTime();
}

router.get("/vote", (req, res) => {
  const categoryFilter = req.query.category && getCategory(req.query.category) ? req.query.category : "all";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const whereCategory = categoryFilter === "all" ? "" : "AND category = ?";
  const params = categoryFilter === "all" ? [] : [categoryFilter];

  const total = db
    .prepare(`SELECT COUNT(*) as n FROM submissions WHERE status = 'approved' ${whereCategory}`)
    .get(...params).n;

  const submissions = db
    .prepare(
      `SELECT * FROM submissions WHERE status = 'approved' ${whereCategory}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset)
    .map((s) => ({ ...s, file_paths: JSON.parse(s.file_paths) }));

  let voteCounts = {};
  if (config.showVoteCountsPublicly && submissions.length) {
    const ids = submissions.map((s) => s.id);
    const rows = db
      .prepare(
        `SELECT submission_id, COUNT(*) as n FROM votes WHERE submission_id IN (${ids
          .map(() => "?")
          .join(",")}) GROUP BY submission_id`
      )
      .all(...ids);
    voteCounts = Object.fromEntries(rows.map((r) => [r.submission_id, r.n]));
  }

  const voterToken = req.cookies && req.cookies.voter_session;
  const voterPayload = session.verify(voterToken);
  const verifiedEmail = voterPayload && voterPayload.role === "voter" ? voterPayload.email : null;

  let votedCategories = [];
  let votedSubmissionIds = [];
  if (verifiedEmail) {
    votedCategories = db
      .prepare(`SELECT category FROM votes WHERE voter_email = ?`)
      .all(verifiedEmail)
      .map((r) => r.category);
    votedSubmissionIds = db
      .prepare(`SELECT submission_id FROM votes WHERE voter_email = ?`)
      .all(verifiedEmail)
      .map((r) => r.submission_id);
  }

  res.render("vote", {
    pageTitle: "Vote",
    submissions,
    categories: config.categories,
    categoryFilter,
    voteCounts,
    verifiedEmail,
    votedCategories,
    votedSubmissionIds,
    pastDeadline: isPastDeadline(),
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

// ---- Step 1: request a one-time code ----
router.post("/vote/request-otp", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (config.allowedEmailDomain && !email.endsWith(config.allowedEmailDomain.toLowerCase())) {
    return res
      .status(400)
      .json({ ok: false, error: `Please use your official college email (${config.allowedEmailDomain}).` });
  }

  try {
    const { code } = otp.generateOtp(email);
    const result = await mailer.sendOtpEmail(email, code, config.competitionName);
    res.json({
      ok: true,
      devMode: result.devMode,
      message: result.devMode
        ? "Dev mail mode is on (no SMTP configured) — check the server console or the admin Dev Mail Outbox for your code."
        : "A verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ ok: false, error: "Could not send verification email. Please try again." });
  }
});

// ---- Step 2: verify the code, issue a voter session cookie ----
router.post("/vote/verify-otp", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const code = (req.body.code || "").trim();

  const result = otp.verifyOtp(email, code);

  if (result !== "ok") {
    const messages = {
      not_found: "Please request a new code first.",
      expired: "That code has expired. Please request a new one.",
      invalid: "That code is incorrect. Please check and try again.",
      too_many_attempts: "Too many incorrect attempts. Please request a new code.",
    };
    return res.status(400).json({ ok: false, error: messages[result] || "Verification failed." });
  }

  const token = session.sign({
    role: "voter",
    email,
    exp: Date.now() + 1000 * 60 * 60 * 6, // 6 hours
  });

  res.cookie("voter_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 6,
  });

  // Make sure a voter row exists for reporting purposes.
  db.prepare(
    `INSERT INTO users (name, email, role, is_verified)
     VALUES (?, ?, 'voter', 1)
     ON CONFLICT(email) DO UPDATE SET is_verified = 1`
  ).run(email, email);

  res.json({ ok: true, email });
});

// ---- Step 3: cast a vote (requires the voter cookie from step 2) ----
router.post("/vote/cast", requireVoter, (req, res) => {
  if (isPastDeadline()) {
    return res.status(400).json({ ok: false, error: "Voting has closed." });
  }

  const submissionId = parseInt(req.body.submissionId, 10);
  const submission = db
    .prepare(`SELECT * FROM submissions WHERE id = ? AND status = 'approved'`)
    .get(submissionId);

  if (!submission) {
    return res.status(404).json({ ok: false, error: "That entry could not be found." });
  }

  const ruleError = checkVoteAllowed(req.voterEmail, submission.category);
  if (ruleError) {
    return res.status(409).json({ ok: false, error: ruleError });
  }

  try {
    db.prepare(
      `INSERT INTO votes (voter_email, submission_id, category) VALUES (?, ?, ?)`
    ).run(req.voterEmail, submission.id, submission.category);
    res.json({ ok: true, message: "Your vote has been recorded. Thank you!" });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ ok: false, error: "You have already voted in this category." });
    }
    console.error("Vote error:", err);
    res.status(500).json({ ok: false, error: "Something went wrong recording your vote." });
  }
});

router.post("/vote/logout", (req, res) => {
  res.clearCookie("voter_session");
  res.json({ ok: true });
});

module.exports = router;
