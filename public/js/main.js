document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- Simple lightbox for any <img data-lightbox> on the page ----
  let overlay = document.querySelector(".lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt="" />';
    document.body.appendChild(overlay);
  }
  const overlayImg = overlay.querySelector("img");

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox]");
    if (trigger) {
      overlayImg.src = trigger.getAttribute("src") || trigger.getAttribute("data-full") || "";
      overlayImg.alt = trigger.getAttribute("alt") || "";
      overlay.classList.add("is-open");
    }
    if (e.target === overlay || e.target.closest(".lightbox-close")) {
      overlay.classList.remove("is-open");
      overlayImg.src = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      overlay.classList.remove("is-open");
      overlayImg.src = "";
    }
  });
});
