/**
 * Minimal signed-token session helper.
 * Avoids pulling in a JWT library: it's just base64url(payload) + HMAC
 * signature, verified with a constant-time comparison. Used for the admin
 * login cookie and the "this email has verified its address for voting"
 * cookie.
 */
const crypto = require("crypto");

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in your .env file."
    );
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function sign(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const encodedPayload = base64url(payload);
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(encodedPayload);
  const signature = base64url(hmac.digest());
  return `${encodedPayload}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(encodedPayload);
  const expectedSignature = base64url(hmac.digest());

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
