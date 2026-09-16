const nodemailer = require("nodemailer");
const db = require("../db/database");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!smtpConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Sends an email if SMTP is configured. Otherwise stores it in the
 * dev_mail_outbox table and logs it to the console, so the whole voting
 * flow can be tested locally before real SMTP credentials exist.
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) {
    console.log(`\n[DEV MAIL MODE] To: ${to}\nSubject: ${subject}\n${text}\n`);
    db.prepare(
      `INSERT INTO dev_mail_outbox (to_email, subject, body) VALUES (?, ?, ?)`
    ).run(to, subject, text);
    return { devMode: true };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: html || undefined,
  });
  return { devMode: false };
}

async function sendOtpEmail(email, code, competitionName) {
  const subject = `Your voting code for ${competitionName}`;
  const text =
    `Your one-time verification code is: ${code}\n\n` +
    `This code expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <p>Your one-time verification code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
    <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
  `;
  return sendMail({ to: email, subject, text, html });
}

module.exports = { sendMail, sendOtpEmail, smtpConfigured };
