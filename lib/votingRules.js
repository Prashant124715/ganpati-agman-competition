const db = require("../db/database");
const config = require("../config/site.config");

/**
 * Returns null if the voter is allowed to cast this vote, or a user-facing
 * error string if not. This is a friendly pre-check; the database's unique
 * index (see db/database.js) is the real, tamper-proof enforcement for the
 * DEFAULT "one_per_category" rule.
 *
 * If you switch config.votingRule to "one_total" or "unlimited", you must
 * ALSO update the unique index in db/database.js to match — see
 * README.md -> "Changing the voting rule". Otherwise the database will keep
 * enforcing the old rule regardless of what this function says.
 */
function checkVoteAllowed(voterEmail, category) {
  const rule = config.votingRule;

  if (rule === "one_per_category") {
    const existing = db
      .prepare(`SELECT id FROM votes WHERE voter_email = ? AND category = ?`)
      .get(voterEmail, category);
    if (existing) return "You have already voted in this category.";
    return null;
  }

  if (rule === "one_total") {
    const existing = db.prepare(`SELECT id FROM votes WHERE voter_email = ?`).get(voterEmail);
    if (existing) return "You have already used your one vote for this competition.";
    return null;
  }

  if (rule === "unlimited") {
    return null; // uniqueness per submission is enforced separately in routes/vote.js
  }

  return "Voting is not configured correctly. Please contact the Marathi Club team.";
}

module.exports = { checkVoteAllowed };
