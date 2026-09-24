/**
 * SITE CONFIGURATION
 * ===================
 * This is the ONE file a core-team member should need to edit for routine
 * changes: competition name, deadline, category text, voting rule, logos,
 * guidelines copy. Nothing here touches the database or routing logic.
 *
 * After editing this file, restart the server (or it will hot-reload if you
 * are running `npm run dev`) for changes to take effect.
 */

module.exports = {
  // ---- Identity ----
  collegeName: "Don Bosco Institute of Technology, Mumbai",
  clubName: "Marathi Club",
  competitionName: "Ganpati Agman 2026",

  // Shown in the header. Replace the files at these paths with the real
  // logos (keep the same filenames, or update the paths below) — see
  // README.md "How to replace the logos".
  collegeLogo: "/img/college-logo.png",
  clubLogo: "/img/marathi-club-logo.png",

  // ---- Dates ----
  // ISO format YYYY-MM-DDTHH:mm:ss (interpreted in server local time).
  submissionDeadline: "2026-09-26T23:59:59",
  votingDeadline: "2026-09-29T23:59:59",

  // ---- Categories ----
  // key must never change once submissions exist (it's stored in the DB).
  // You can freely edit label/description/instructions any time.
  // allowedExt / allowedMime control upload validation.
  // maxFileSizeMB and maxFiles control upload limits.
  categories: [
    {
      key: "home-decor",
      label: "Home Decor",
      shortLabel: "Home Decor",
      audience: "students-and-faculty",
      description:
        "Show off your Ganpati / home decoration! Submit one or more clear photographs of your setup.",
      instructions:
        "Upload well-lit photos. You may submit up to 5 images for a single entry.",
      allowedExt: ["jpg", "jpeg", "png", "webp"],
      allowedMime: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMB: 15,
      maxFiles: 5,
      mediaType: "image",
    },
    {
      key: "reel-making",
      label: "Reel Making",
      shortLabel: "Reels",
      audience: "students-and-faculty",
      description:
        "Create a short Ganpati-themed reel and share the story of your celebration in motion.",
      instructions:
        "Upload a single video file. Keep it well within the size limit below for a smooth upload.",
      allowedExt: ["mp4", "mov", "webm"],
      allowedMime: ["video/mp4", "video/quicktime", "video/webm"],
      maxFileSizeMB: 200,
      maxFiles: 1,
      mediaType: "video",
    },
    {
      key: "literature",
      label: "Literature",
      shortLabel: "Literature",
      audience: "students-and-faculty",
      description:
        "Poetry, short stories, or any Marathi creative writing inspired by Ganpati Agman.",
      instructions:
        "Upload a PDF, or a clear photo/scan of handwritten work.",
      allowedExt: ["pdf", "jpg", "jpeg", "png"],
      allowedMime: ["application/pdf", "image/jpeg", "image/png"],
      maxFileSizeMB: 20,
      maxFiles: 3,
      mediaType: "document",
    },
    {
      key: "faculty-corner",
      label: "Faculty Corner",
      shortLabel: "Faculty Corner",
      audience: "faculty-only",
      description:
        "A dedicated space for faculty members to share their own Ganpati Agman creativity — decor, writing, or a short video.",
      instructions:
        "Faculty may upload images, a PDF, or a short video for their entry.",
      allowedExt: ["jpg", "jpeg", "png", "webp", "pdf", "mp4", "mov", "webm"],
      allowedMime: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ],
      maxFileSizeMB: 200,
      maxFiles: 5,
      mediaType: "mixed",
    },
  ],

  // ---- Voting rule ----
  // "one_per_category"   -> a voter may cast exactly one vote in each category (default)
  // "one_total"          -> a voter may cast exactly one vote across the whole competition
  // "unlimited"          -> a voter may vote for as many entries as they like, once each
  // Changing this only affects future votes; see README "Changing the voting rule".
  votingRule: "one_per_category",

  // Only college-domain emails may vote/submit. Set to null to allow any email.
  // Example: "@yourcollege.edu.in" — leave null while testing.
  allowedEmailDomain: null,

  // Whether raw vote counts are shown publicly on the voting page cards.
  showVoteCountsPublicly: false,

  // ---- Guidelines page copy ----
  guidelines: {
    whoCanParticipate:
      "All currently enrolled students and faculty members of Don Bosco Institute of Technology, Mumbai are eligible to participate. Home Decor, Reel Making and Literature categories are open to everyone; Faculty Corner is exclusively for faculty members.",
    submissionRules: [
      "Entries are collected by the Marathi Club core team and published directly on the website.",
      "Participants must provide their full name, official college email address, and college ID / employee ID along with their entry.",
      "Each participant may submit one entry per category.",
      "All content must be original work created by the participant — no copied or AI-generated content.",
      "Entries must be respectful, appropriate for a college audience, and related to the Ganpati Agman theme.",
      "Accepted file formats and size limits are displayed on the submission form for each category.",
    ],
    votingRules: [
      "Voting ends on 29th September 2026 at 11:59 PM — no votes will be accepted after this deadline.",
      "Voting is open to all DBIT students and faculty using their official college email.",
      "You must verify your email with a one-time code (OTP) before casting your vote.",
      "You may vote for one entry per category — once submitted, your vote cannot be changed or withdrawn.",
      "Results will be announced by the Marathi Club core team after the voting period ends.",
    ],
    generalInstructions: [
      "Ensure your files are within the size limits shown for each category before submitting.",
      "Use a stable internet connection when uploading large video files to avoid upload failures.",
      "For any technical issues or queries, contact the Marathi Club core team.",
      "By participating, you agree to the rules and the decisions of the organising committee.",
    ],
  },

  aboutClub:
    "The Marathi Club brings together students who celebrate and share Marathi language, art and culture on campus throughout the year. The Ganpati Agman online competition is our way of bringing the warmth of Ganesh Chaturthi to the whole college community — however you're celebrating, wherever you are.",
};
