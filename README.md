# Ganpati Agman — Online Competition Website

A full-stack site for the Marathi Club's Ganpati Agman / Ganesh Chaturthi online
competition: participant submissions with file upload, admin review, and
email-verified voting — all backed by a real, persistent database.

**Stack:** Node.js + Express, SQLite (via `better-sqlite3`, a single file on
disk — no separate database server to install or pay for), EJS templates,
Multer for uploads, Nodemailer for voter email verification.

> **A note on how this was built:** I wrote this in a sandboxed environment
> with no internet access, so I was not able to run `npm install` or actually
> start the server to test it live before handing it to you. I hand-verified
> the logic that doesn't need external packages (password hashing, signed
> sessions, OTP generation) by running it directly, and syntax-checked every
> file, but the full Express/Multer/EJS/Nodemailer wiring has **not** been
> run end-to-end yet. Please work through "First run" and the "Test
> checklist" below before you rely on this for the real competition — and if
> something doesn't work, the error message plus which step you were on will
> tell us exactly where to look.

---

## 1. Requirements

- Node.js 18 or newer (check with `node -v`)
- A place to host it that gives you a **persistent filesystem** — a VPS,
  Render/Railway (with a persistent disk/volume), your college's own server,
  or similar. **Do not deploy this to Vercel or another serverless
  platform** — serverless platforms don't keep files on disk between
  requests, so your SQLite database and uploaded files would vanish.
- (For real voting) an email account you can send SMTP mail from — your
  college address, or Gmail with an **App Password** (not your normal
  Gmail password), or a transactional email service like Brevo, Zoho, or
  Resend.

## 2. First run (local machine)

```bash
cd ganpati-agman
npm install
cp .env.example .env
```

Now open `.env` and fill in:
- `SESSION_SECRET` — generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — your first admin login
- Leave `SMTP_*` blank for now — see "Dev Mail Mode" below

Create the admin account and start the server:

```bash
npm run create-admin
npm start
```

Visit `http://localhost:3000`. Log in to the admin dashboard at
`http://localhost:3000/admin/login` with the email/password you set.

### Dev Mail Mode (testing voting without real email)

If `SMTP_HOST` is blank in `.env`, the app doesn't fail — it prints the OTP
code to your terminal **and** saves it to the admin dashboard's "Dev Mail
Outbox" tab. This lets you test the entire voting flow (request code → look
it up in the dashboard → verify → vote) before you've set up real email.
**Turn on real SMTP before the competition goes live** — dev mode should
never be used in production, since anyone could read the code from the
dashboard.

## 3. Test checklist

Work through these in order — each one builds on the last:

1. Submit a test entry at `/submit/home-decor` with a small image.
2. Confirm you land on the "submission received" page with a code like
   `GA26-XXXXXX`.
3. Log into `/admin/login` and confirm the submission appears under the
   Submissions tab, status "pending".
4. Click **Approve**. Confirm the status badge updates immediately.
5. Visit `/vote` and confirm the approved entry now appears there.
6. Enter your email in the voter panel, click **Send Code**.
7. If SMTP isn't set up: open the admin dashboard's "Dev Mail Outbox" tab
   and copy the code from there. If SMTP is set up: check your inbox.
8. Enter the code and verify. Confirm the panel now shows "Voting as…".
9. Click **Vote** on the entry. Confirm the button changes to "Voted ✓" and
   every other entry in that category becomes disabled.
10. Refresh the page — confirm the voted state persists (this proves the
    vote is in the database, not just the page).
11. Try voting again in the same category from the same browser — confirm
    it's blocked. Then try from a different browser/incognito window with
    the same email + a fresh code — confirm it's *still* blocked (this
    proves the database, not the frontend, is enforcing one-vote-per-
    category).
12. In the admin dashboard, confirm the vote count and the "Total Votes"
    stat both increased by one.
13. Try `/admin/export.csv` and confirm it downloads a CSV with your test
    submission and its vote count.
14. Open the site on your phone (or a narrow browser window) and confirm
    the header, forms, and voting cards are usable and buttons are easy to
    tap.

If every step above works, you're ready to replace the placeholder logos
and content and go live.

## 4. Day-to-day admin tasks (no code changes needed)

### Change competition name, deadlines, category text, voting rule
Edit **`config/site.config.js`** — it's written to be the one file a
non-programmer core-team member can safely edit. Change the value, save,
restart the server (`npm start` again, or it auto-reloads if you're running
`npm run dev`).

### Replace the college logo / Marathi Club logo
Replace the files at `public/img/college-logo-placeholder.svg` and
`public/img/club-logo-placeholder.svg` with your real logo images (any
format — `.png`, `.jpg`, `.svg` all work). Then update the two paths near
the top of `config/site.config.js`:

```js
collegeLogo: "/img/your-college-logo.png",
clubLogo: "/img/your-club-logo.png",
```

### Change category names/descriptions/allowed file types
Edit the `categories` array in `config/site.config.js`. **Do not change a
category's `key`** once submissions exist for it — the key is stored in the
database to link submissions to their category. You can freely rename
`label`, `description`, `instructions`, `allowedExt`, `maxFileSizeMB`, etc.
at any time.

### Change the deadline
Edit `submissionDeadline` / `votingDeadline` in `config/site.config.js`
(format: `"YYYY-MM-DDTHH:mm:ss"`).

### Changing the voting rule
`config.votingRule` supports `"one_per_category"` (default), `"one_total"`,
or `"unlimited"`. **Important:** the database has a UNIQUE index that
physically enforces the *default* rule even if someone bypasses the
website entirely. If you switch away from `"one_per_category"`, you must
also update the index in `db/database.js`:

```sql
-- current (one vote per category):
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_per_category ON votes(voter_email, category);

-- for "one_total" (one vote for the whole competition), replace with:
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_per_category ON votes(voter_email);

-- for "unlimited" (one vote per entry, but any number of entries), replace with:
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_per_category ON votes(voter_email, submission_id);
```

After editing, delete the old index once from a terminal (`sqlite3
data/ganpati-agman.db "DROP INDEX uniq_vote_per_category;"`) so the new one
can be created on next start — or just delete `data/ganpati-agman.db`
entirely if no real votes have been cast yet.

### How to change the admin account / password
Update `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, then run
`npm run create-admin` again. This updates the existing admin (matched by
old or new email) rather than creating duplicates when the email is
unchanged.

### How to view submissions / votes
- **Submissions:** Admin Dashboard → Submissions tab. Filter by category or
  status, or search by name / college ID / submission code / email.
- **Votes:** vote counts appear per-submission in the Submissions tab, and
  totals + category breakdowns are in the Category Stats tab.
- **Export everything:** click "Export CSV" in the dashboard for a
  spreadsheet of every submission with its current vote count.

## 5. Database structure

SQLite file at `data/ganpati-agman.db` (created automatically on first
run). Tables:

| Table | Purpose |
|---|---|
| `users` | Anyone who has submitted, voted, or holds an admin account. `role` is `participant`, `voter`, or `admin`. Only admins have a `password_hash`. |
| `submissions` | One row per entry: category, title, description, JSON list of uploaded files, `status` (`pending`/`approved`/`rejected`), and a unique `submission_code`. |
| `votes` | One row per vote: voter email, which submission, which category. A UNIQUE index prevents duplicates per the current voting rule. |
| `otp_codes` | Short-lived, hashed one-time codes for voter email verification. Never stores the code in plain text. |
| `dev_mail_outbox` | Only used when SMTP isn't configured — lets you read OTP codes from the admin dashboard during testing. |

Uploaded files live under `uploads/<category-key>/` and are referenced from
`submissions.file_paths` (a JSON array of `{path, originalName, mime,
size}`).

## 6. Deploying

Any host that (a) runs Node.js and (b) gives you a **persistent disk** will
work — for example a college server, a small VPS (DigitalOcean, Linode),
or Render/Railway with a persistent volume attached at `/data` and
`/uploads` (adjust the paths in `db/database.js` and `lib/upload.js` if your
host requires a specific mount point).

General steps:

1. Push this project to a private git repository (the `.gitignore` already
   excludes `.env`, the database file, and uploaded files — don't commit
   real participant data or secrets).
2. On the server: `npm install --omit=dev`, copy your real `.env` values
   across (never commit this file), then `npm run create-admin`.
3. Run `npm start` behind a process manager (e.g. `pm2 start server.js`) so
   it restarts automatically if it crashes or the server reboots.
4. Put a reverse proxy (Nginx, or your host's built-in one) in front for
   HTTPS. Once you're serving over HTTPS, set `NODE_ENV=production` in
   `.env` — this makes the login/voting cookies `secure`, so they're only
   sent over HTTPS.
5. Set `BASE_URL` in `.env` to your real domain.
6. Take regular backups of `data/ganpati-agman.db` and the `uploads/`
   folder — that's your entire dataset.

## 7. Security notes

- Admin and voter sessions are signed cookies (HMAC-SHA256), not readable
  or forgeable without `SESSION_SECRET` — keep that value private and never
  commit `.env`.
- Passwords are hashed with `scrypt` (Node's built-in, salted per-user) —
  never stored in plain text.
- OTP codes are hashed before storage and expire after 10 minutes; each has
  a limited number of guess attempts.
- All file type/size checks happen on the server (in `lib/upload.js`), not
  just in the browser, so they can't be bypassed by editing the page.
- The vote-uniqueness rule is enforced by a database constraint, not just
  application code — see "Changing the voting rule" above for why that
  matters.

## 8. Project structure

```
config/site.config.js     ← the file you'll edit most often
db/database.js            ← schema + persistent SQLite connection
lib/                       session signing, password hashing, OTP, mailer, uploads, voting rule
middleware/                admin/voter auth guards
routes/                    pages.js, submissions.js, vote.js, admin.js
views/                     EJS templates (one per page) + partials/ (header/footer)
public/                    css, client-side js, logo placeholders
uploads/<category>/        uploaded participant files (persistent)
data/ganpati-agman.db      the database (created on first run)
scripts/create-admin.js    run via `npm run create-admin`
```
