const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const config = require("../config/site.config");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

function getCategory(key) {
  return config.categories.find((c) => c.key === key);
}

// The single largest allowed size across all categories. Multer needs one
// fixed number at setup time; the *real*, category-specific limit is
// re-checked by hand in the route handler after upload (see submissions.js),
// so a Home Decor upload can't sneak in at the Reel Making size ceiling.
const GLOBAL_MAX_BYTES =
  Math.max(...config.categories.map((c) => c.maxFileSizeMB)) * 1024 * 1024;

function sanitizeExt(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(".", "");
  return ext.replace(/[^a-z0-9]/g, "");
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const category = getCategory(req.params.categoryKey);
    if (!category) return cb(new Error("Unknown category"));

    const dir = path.join(UPLOAD_ROOT, category.key);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    const ext = sanitizeExt(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    cb(null, ext ? `${unique}.${ext}` : unique);
  },
});

function fileFilter(req, file, cb) {
  const category = getCategory(req.params.categoryKey);
  if (!category) return cb(new Error("Unknown category"));

  const ext = sanitizeExt(file.originalname);
  const extOk = category.allowedExt.includes(ext);
  const mimeOk = category.allowedMime.includes(file.mimetype);

  if (!extOk || !mimeOk) {
    const err = new Error(
      `"${file.originalname}" is not an allowed file type for ${category.label}. Allowed: ${category.allowedExt.join(
        ", "
      )}.`
    );
    err.code = "BAD_FILE_TYPE";
    return cb(err);
  }
  cb(null, true);
}

const baseUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: GLOBAL_MAX_BYTES, files: 5 },
});

/**
 * Route-level middleware: validates the category param, applies the correct
 * per-category max file count, and translates multer/file errors into a
 * friendly `req.uploadError` string instead of throwing, so the route
 * handler can re-render the form with a clear message instead of a 500 page.
 */
function submissionUpload(req, res, next) {
  const category = getCategory(req.params.categoryKey);
  if (!category) {
    return res.status(404).render("error", {
      title: "Unknown category",
      message: "That competition category does not exist.",
    });
  }

  const handler = baseUpload.array("files", category.maxFiles);

  handler(req, res, (err) => {
    if (err) {
      req.uploadError =
        err.code === "LIMIT_FILE_SIZE"
          ? `One of your files is larger than the ${category.maxFileSizeMB}MB limit for ${category.label}.`
          : err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT"
          ? `You can upload at most ${category.maxFiles} file(s) for ${category.label}.`
          : err.message || "File upload failed. Please try again.";
      return next();
    }

    // Multer's per-instance fileSize limit is the GLOBAL max, so re-check
    // each file against this category's real, possibly smaller, limit.
    if (req.files && req.files.length) {
      const maxBytes = category.maxFileSizeMB * 1024 * 1024;
      const tooBig = req.files.find((f) => f.size > maxBytes);
      if (tooBig) {
        req.uploadError = `"${tooBig.originalname}" is larger than the ${category.maxFileSizeMB}MB limit for ${category.label}.`;
        for (const f of req.files) {
          fs.unlink(f.path, () => {});
        }
        req.files = [];
      }
    }
    next();
  });
}

module.exports = { submissionUpload, getCategory, UPLOAD_ROOT };
