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
  collegeName: "Your College Name",
  clubName: "Marathi Club",
  competitionName: "Ganpati Agman 2026",

  // Shown in the header. Replace the files at these paths with the real
  // logos (keep the same filenames, or update the paths below) — see
  // README.md "How to replace the logos".
  collegeLogo: "/img/college-logo-placeholder.svg",
  clubLogo: "/img/club-logo-placeholder.svg",

  // ---- Dates ----
  // ISO format YYYY-MM-DDTHH:mm:ss (interpreted in server local time).
  submissionDeadline: "2026-09-30T23:59:59",
  votingDeadline: "2026-10-07T23:59:59",

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
      "All currently enrolled students and faculty members of the college. Home Decor, Reel Making and Literature are open to students and faculty; Faculty Corner is reserved for faculty members.",
    submissionRules: [
      "One entry per person per category. Submit your best work — you can always contact the Marathi Club core team before the deadline if you need to correct a mistake.",
      "Use your official college email address and college ID / employee ID when submitting.",
      "Content must be original and created by the participant.",
      "Submissions must be respectful and appropriate for a college audience.",
      "All submissions are reviewed by the Marathi Club team before they appear publicly. This usually takes 1–2 days.",
    ],
    votingRules: [
      "Voting is open to all students and faculty using their official college email.",
      "You must verify your email with a one-time code before you can vote.",
      "You may vote once per category (see current rule above) — you cannot change your vote once submitted.",
      "Only approved entries are shown on the voting page.",
    ],
    generalInstructions: [
      "Keep files within the size limits shown on the submission form for each category.",
      "For technical issues, reach out to the Marathi Club core team.",
    ],
  },

  aboutClub:
    "The Marathi Club brings together students who celebrate and share Marathi language, art and culture on campus throughout the year. The Ganpati Agman online competition is our way of bringing the warmth of Ganesh Chaturthi to the whole college community — however you're celebrating, wherever you are.",
};
