const session = require("../lib/session");

/**
 * Protects /admin/* routes. Reads the signed "admin_session" cookie set at
 * login. Redirects to the login page (rather than a bare 401) so a core-team
 * member landing on a protected link is guided back in.
 */
function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.admin_session;
  const payload = session.verify(token);

  if (!payload || payload.role !== "admin") {
    return res.redirect("/admin/login?next=" + encodeURIComponent(req.originalUrl));
  }

  req.admin = payload;
  next();
}

module.exports = requireAdmin;
