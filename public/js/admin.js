(() => {
  const state = { category: "all", q: "", page: 1 };
  let searchDebounce = null;
  let currentSubmissions = [];

  const el = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtDate(iso) {
    try {
      const isoNormalized = String(iso).replace(" ", "T") + "Z";
      return new Date(isoNormalized).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  }

  async function loadStats() {
    const res = await fetch("/admin/api/stats");
    const data = await res.json();
    if (!data.ok) return;

    el("statGrid").innerHTML = `
      <div class="stat-card"><div class="n">${data.totals.total || 0}</div><div class="l">Total Entries</div></div>
      <div class="stat-card"><div class="n">${data.totals.votes || 0}</div><div class="l">Total Votes</div></div>
    `;

    el("categoryStats").innerHTML = data.byCategory
      .map(
        (c) => `
        <div class="category-stat-row">
          <span><strong>${escapeHtml(c.label)}</strong></span>
          <span class="muted">${c.total} entries · ${c.votes} votes</span>
        </div>`
      )
      .join("") || `<p class="muted">No data yet.</p>`;
  }

  function renderFileLinks(files) {
    if (!files || !files.length) return `<span class="muted">—</span>`;
    return `<div class="file-links">${files
      .map((f, i) => `<a href="${f.path}" target="_blank" rel="noopener">File ${i + 1}</a>`)
      .join("")}</div>`;
  }


  async function loadSubmissions() {
    const params = new URLSearchParams({
      category: state.category,
      q: state.q,
      page: state.page,
    });
    const res = await fetch(`/admin/api/submissions?${params.toString()}`);
    const data = await res.json();
    if (!data.ok) return;

    currentSubmissions = data.submissions || [];
    const body = el("submissionsBody");
    if (!data.submissions.length) {
      body.innerHTML = `<tr><td colspan="8" class="center muted">No submissions match these filters.</td></tr>`;
    } else {
      body.innerHTML = data.submissions
        .map(
          (s) => `
        <tr data-id="${s.id}">
          <td>${escapeHtml(s.submission_code)}</td>
          <td>${escapeHtml(s.category)}</td>
          <td>${escapeHtml(s.name)}<br/><span class="muted">${escapeHtml(s.college_id)}<br/>${escapeHtml(s.email)}</span></td>
          <td>${escapeHtml(s.title)}<br/><span class="muted">${escapeHtml(s.description || "")}</span></td>
          <td>${renderFileLinks(s.file_paths)}</td>
          <td>${s.vote_count}</td>
          <td>${fmtDate(s.created_at)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-small btn-outline" data-action="edit" data-id="${s.id}">Edit</button>
              <button class="btn btn-small btn-danger" data-action="delete" data-id="${s.id}">Delete</button>
            </div>
          </td>
        </tr>`
        )
        .join("");
    }

    const pag = el("pagination");
    if (data.totalPages <= 1) {
      pag.innerHTML = "";
    } else {
      let buttons = "";
      for (let p = 1; p <= data.totalPages; p++) {
        buttons += `<button class="btn btn-small ${p === data.page ? "btn-gold" : "btn-outline"}" data-page="${p}">${p}</button>`;
      }
      pag.innerHTML = buttons;
    }
  }

  async function loadDevOutbox() {
    const res = await fetch("/admin/api/dev-outbox");
    const data = await res.json();
    if (!data.ok) return;
    const list = el("devMailList");
    if (!data.mails.length) {
      list.innerHTML = `<p class="muted">No dev-mode emails yet. They'll appear here once someone requests a voting code and SMTP isn't configured.</p>`;
      return;
    }
    list.innerHTML = data.mails
      .map(
        (m) => `
      <div class="form-card" style="max-width:none; margin-bottom:14px; text-align:left;">
        <p style="margin:0 0 4px;"><strong>${escapeHtml(m.subject)}</strong></p>
        <p class="muted" style="margin:0 0 8px;">To: ${escapeHtml(m.to_email)} · ${fmtDate(m.created_at)}</p>
        <pre style="white-space:pre-wrap; margin:0; font-family:inherit;">${escapeHtml(m.body)}</pre>
      </div>`
      )
      .join("");
  }

  function openEditModal(sub) {
    el("editId").value = sub.id;
    el("editName").value = sub.name;
    el("editCollegeId").value = sub.college_id;
    el("editEmail").value = sub.email;
    el("editTitle").value = sub.title;
    el("editDescription").value = sub.description || "";
    el("editMsg").textContent = "";
    el("editModal").style.display = "flex";
  }

  function closeEditModal() {
    el("editModal").style.display = "none";
  }

  async function handleAction(action, id, button) {
    if (action === "edit") {
      const sub = currentSubmissions.find((item) => item.id == id);
      if (sub) openEditModal(sub);
      return;
    }
    if (action === "delete" && !confirm("Permanently delete this submission and its uploaded files?")) return;
    if (action === "delete") {
      await fetch(`/admin/api/submissions/${id}`, { method: "DELETE" });
    }
    loadStats();
    loadSubmissions();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadStats();
    loadSubmissions();

    el("filterCategory").addEventListener("change", (e) => {
      state.category = e.target.value;
      state.page = 1;
      loadSubmissions();
    });
    el("filterSearch").addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.q = e.target.value;
        state.page = 1;
        loadSubmissions();
      }, 350);
    });

    el("submissionsBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      handleAction(btn.dataset.action, btn.dataset.id, btn);
    });

    el("pagination").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      state.page = parseInt(btn.dataset.page, 10);
      loadSubmissions();
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
        document.getElementById(`tab-${btn.dataset.tab}`).style.display = "";
        if (btn.dataset.tab === "devmail") loadDevOutbox();
      });
    });

    const closeBtn = el("closeEditModal");
    if (closeBtn) closeBtn.addEventListener("click", closeEditModal);

    const editForm = el("editForm");
    if (editForm) {
      editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = el("editId").value;
        const payload = {
          name: el("editName").value.trim(),
          college_id: el("editCollegeId").value.trim(),
          email: el("editEmail").value.trim(),
          title: el("editTitle").value.trim(),
          description: el("editDescription").value.trim(),
        };

        const res = await fetch(`/admin/api/submissions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!resData.ok) {
          el("editMsg").textContent = resData.error || "Failed to save changes.";
        } else {
          closeEditModal();
          loadStats();
          loadSubmissions();
        }
      });
    }
  });
})();
