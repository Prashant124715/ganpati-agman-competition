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

  document.addEventListener("DOMContentLoaded", () => {
    wireOtpFlow();
    wireLogout();
    wireVoteButtons();
  });
})();
