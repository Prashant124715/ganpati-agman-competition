const session = require("../lib/session");

/**
 * Protects the "cast a vote" endpoint. A voter earns this cookie only after
 * successfully verifying a one-time code sent to their college email
 * (see routes/vote.js). This is what stops someone from voting just by
 * typing an email address into a box.
 */
function requireVoter(req, res, next) {
  const token = req.cookies && req.cookies.voter_session;
  const payload = session.verify(token);

  if (!payload || payload.role !== "voter" || !payload.email) {
    return res.status(401).json({
      ok: false,
      error: "Please verify your college email address before voting.",
    });
  }

  req.voterEmail = payload.email;
  next();
}

module.exports = requireVoter;
