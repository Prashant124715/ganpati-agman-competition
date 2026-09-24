document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (toggle && nav) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---- Premium Lightbox for card images & [data-lightbox] elements ----
  let overlay = document.querySelector(".lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
      <div class="lightbox-container">
        <button class="lightbox-close" aria-label="Close image">&times;</button>
        <img class="lightbox-img" src="" alt="" />
        <div class="lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const overlayImg = overlay.querySelector(".lightbox-img");
  const overlayCaption = overlay.querySelector(".lightbox-caption");

  function openLightbox(src, captionText) {
    if (!src) return;
    overlayImg.src = src;
    overlayImg.alt = captionText || "Full size view";
    if (captionText) {
      overlayCaption.textContent = captionText;
      overlayCaption.style.display = "block";
    } else {
      overlayCaption.style.display = "none";
    }
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlayImg.src = "";
    }, 200);
  }

  document.addEventListener("click", (e) => {
    // 1. Direct click on image with data-lightbox or inside .entry-card__media
    const imgTrigger = e.target.closest("img[data-lightbox]");
    if (imgTrigger) {
      const card = imgTrigger.closest(".entry-card");
      const title = card ? (card.querySelector(".entry-card__title")?.textContent || imgTrigger.alt) : imgTrigger.alt;
      openLightbox(imgTrigger.getAttribute("src") || imgTrigger.getAttribute("data-full"), title);
      return;
    }

    // 2. Click on .entry-card__media container (if containing image)
    const mediaContainer = e.target.closest(".entry-card__media");
    if (mediaContainer && !e.target.closest("video") && !e.target.closest("a")) {
      const img = mediaContainer.querySelector("img");
      if (img) {
        const card = mediaContainer.closest(".entry-card");
        const title = card ? (card.querySelector(".entry-card__title")?.textContent || img.alt) : img.alt;
        openLightbox(img.getAttribute("src") || img.getAttribute("data-full"), title);
        return;
      }
    }

    // Close handlers
    if (e.target === overlay || e.target.closest(".lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeLightbox();
    }
  });
});
