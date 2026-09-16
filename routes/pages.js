const express = require("express");
const router = express.Router();
const config = require("../config/site.config");
const db = require("../db/database");

router.get("/", (req, res) => {
  const counts = db
    .prepare(
      `SELECT category, COUNT(*) as approved_count
       FROM submissions WHERE status = 'approved' GROUP BY category`
    )
    .all();
  const countByCategory = Object.fromEntries(counts.map((c) => [c.category, c.approved_count]));

  res.render("home", {
    pageTitle: "Home",
    countByCategory,
  });
});

router.get("/competitions", (req, res) => {
  res.render("competitions", { pageTitle: "Competitions" });
});

router.get("/guidelines", (req, res) => {
  res.render("guidelines", { pageTitle: "Guidelines" });
});

router.get("/about", (req, res) => {
  res.render("about", { pageTitle: "About the Marathi Club" });
});

module.exports = router;
