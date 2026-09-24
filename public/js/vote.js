(() => {
  const el = (id) => document.getElementById(id);

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { ok: false, error: "Unexpected server response." };
    }
    return { status: res.status, data };
  }

  function wireOtpFlow() {
    const requestBtn = el("requestOtpBtn");
    const verifyBtn = el("verifyOtpBtn");
    if (!requestBtn) return; // already verified, panel not rendered

    requestBtn.addEventListener("click", async () => {
      const email = el("voterEmail").value.trim();
      const msg = el("otpEmailMsg");
      if (!email) {
        msg.textContent = "Please enter your college email address.";
        return;
      }
      requestBtn.disabled = true;
      requestBtn.textContent = "Sending…";
      const { data } = await postJson("/vote/request-otp", { email });
      requestBtn.disabled = false;
      requestBtn.textContent = "Send Code";

      if (data.ok) {
        msg.textContent = data.message;
        el("otpStepCode").style.display = "block";
        el("voterCode").focus();
      } else {
        msg.textContent = data.error || "Could not send code.";
      }
    });

    verifyBtn.addEventListener("click", async () => {
      const email = el("voterEmail").value.trim();
      const code = el("voterCode").value.trim();
      const msg = el("otpCodeMsg");
      if (!code) {
        msg.textContent = "Please enter the code from your email.";
        return;
      }
      verifyBtn.disabled = true;
      const { data } = await postJson("/vote/verify-otp", { email, code });
      verifyBtn.disabled = false;

      if (data.ok) {
        window.location.reload();
      } else {
        msg.textContent = data.error || "Verification failed.";
      }
    });
  }

  function wireLogout() {
    const btn = el("voterLogoutBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      await fetch("/vote/logout", { method: "POST" });
      window.location.reload();
    });
  }

  function wireVoteButtons() {
    document.querySelectorAll(".vote-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".entry-card");
        const category = card.dataset.category;
        const submissionId = btn.dataset.id;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Voting…";

        const { data } = await postJson("/vote/cast", { submissionId });

        if (data.ok) {
          btn.textContent = "Voted ✓";
          btn.classList.remove("btn-primary");
          btn.classList.add("btn-gold");
          // Optimistic UI for the DEFAULT "one_per_category" rule: locks
          // every other vote button in this category. The server (not this
          // script) is the real source of truth, so a page refresh always
          // shows the correct state. If you switch config.votingRule to
          // "unlimited" in config/site.config.js, remove this block — under
          // that rule a voter CAN vote for more than one entry per category.
          document
            .querySelectorAll(`.entry-card[data-category="${category}"] .vote-btn`)
            .forEach((otherBtn) => {
              if (otherBtn !== btn) {
                otherBtn.disabled = true;
                otherBtn.textContent = "Voted in category";
              }
            });
        } else {
          btn.disabled = false;
          btn.textContent = originalText;
          alert(data.error || "Could not record your vote. Please verify your email first.");
        }
      });
    });
  }

  function initCarousels() {
    document.querySelectorAll("[data-carousel]").forEach((carousel) => {
      const track = carousel.querySelector(".carousel__track");
      const slides = carousel.querySelectorAll(".carousel__slide");
      const prevBtn = carousel.querySelector(".carousel__arrow--prev");
      const nextBtn = carousel.querySelector(".carousel__arrow--next");
      const dots = carousel.querySelectorAll(".carousel__dot");
      const counter = carousel.querySelector(".carousel__counter");
      const total = slides.length;

      if (!track || total <= 1) return;

      let activeIndex = 0;

      function goTo(index) {
        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        activeIndex = index;

        track.style.setProperty("--active", activeIndex);

        dots.forEach((d, i) => {
          d.classList.toggle("is-active", i === activeIndex);
        });

        if (counter) {
          counter.textContent = `${activeIndex + 1} / ${total}`;
        }

        if (prevBtn) prevBtn.disabled = activeIndex === 0;
        if (nextBtn) nextBtn.disabled = activeIndex === total - 1;
      }

      // Set initial state
      goTo(0);

      if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          goTo(activeIndex - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          goTo(activeIndex + 1);
        });
      }

      dots.forEach((dot) => {
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(dot.dataset.index, 10);
          if (!isNaN(idx)) goTo(idx);
        });
      });

      // Touch Swiping (Instagram style)
      let startX = 0;
      let startY = 0;
      let deltaX = 0;
      let isSwiping = false;

      carousel.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        deltaX = 0;
        isSwiping = true;
      }, { passive: true });

      carousel.addEventListener("touchmove", (e) => {
        if (!isSwiping || e.touches.length !== 1) return;
        deltaX = e.touches[0].clientX - startX;
      }, { passive: true });

      carousel.addEventListener("touchend", () => {
        if (!isSwiping) return;
        isSwiping = false;
        const threshold = 35; // px threshold for swipe trigger
        if (deltaX < -threshold) {
          goTo(activeIndex + 1);
        } else if (deltaX > threshold) {
          goTo(activeIndex - 1);
        }
      });
    });
  }

  function wireVideoModal() {
    const modal   = el("videoModal");
    const player  = el("videoModalPlayer");
    const closeBtn = el("videoModalClose");
    const titleEl = el("videoModalTitle");
    if (!modal || !player) return;

    function openModal(src, title) {
      player.src = src;
      titleEl.textContent = title || "";
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      player.play().catch(() => {}); // autoplay may be blocked — that's fine
    }

    function closeModal() {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      player.pause();
      player.src = "";
    }

    // Wire every play button
    document.querySelectorAll("[data-video-wrap]").forEach((wrap) => {
      const video = wrap.querySelector("video");
      const btn   = wrap.querySelector(".video-play-btn");
      if (!video || !btn) return;
      btn.addEventListener("click", () => {
        openModal(video.src || video.currentSrc, wrap.closest(".entry-card")?.querySelector(".entry-card__title")?.textContent || "");
      });
    });

    closeBtn.addEventListener("click", closeModal);

    // Click outside inner box → close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireOtpFlow();
    wireLogout();
    wireVoteButtons();
    initCarousels();
    wireVideoModal();
  });
})();
