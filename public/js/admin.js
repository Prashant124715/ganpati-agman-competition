(() => {
  const state = { category: "all", status: "all", q: "", page: 1 };
  let searchDebounce = null;

  const el = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtDate(iso) {
    try {
      // SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, space
      // separator) — normalize to a real ISO string before parsing.
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
      <div class="stat-card"><div class="n">${data.totals.total || 0}</div><div class="l">Total Submissions</div></div>
      <div class="stat-card"><div class="n">${data.totals.pending || 0}</div><div class="l">Pending</div></div>
      <div class="stat-card"><div class="n">${data.totals.approved || 0}</div><div class="l">Approved</div></div>
      <div class="stat-card"><div class="n">${data.totals.rejected || 0}</div><div class="l">Rejected</div></div>
      <div class="stat-card"><div class="n">${data.totals.votes || 0}</div><div class="l">Total Votes</div></div>
    `;

    el("categoryStats").innerHTML = data.byCategory
      .map(
        (c) => `
        <div class="category-stat-row">
          <span><strong>${escapeHtml(c.label)}</strong></span>
          <span class="muted">${c.total} total · ${c.approved} approved · ${c.pending} pending · ${c.rejected} rejected · ${c.votes} votes</span>
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

  function badge(status) {
    return `<span class="badge badge-${status}">${status}</span>`;
  }

  async function loadSubmissions() {
    const params = new URLSearchParams({
      category: state.category,
      status: state.status,
      q: state.q,
      page: state.page,
    });
    const res = await fetch(`/admin/api/submissions?${params.toString()}`);
    const data = await res.json();
    if (!data.ok) return;

    const body = el("submissionsBody");
    if (!data.submissions.length) {
      body.innerHTML = `<tr><td colspan="9" class="center muted">No submissions match these filters.</td></tr>`;
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
          <td>${badge(s.status)}${s.admin_note ? `<br/><span class="muted">${escapeHtml(s.admin_note)}</span>` : ""}</td>
          <td>${s.vote_count}</td>
          <td>${fmtDate(s.created_at)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-small btn-secondary" data-action="approve" data-id="${s.id}" ${s.status === "approved" ? "disabled" : ""}>Approve</button>
              <button class="btn btn-small btn-outline" data-action="reject" data-id="${s.id}" ${s.status === "rejected" ? "disabled" : ""}>Reject</button>
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

  async function handleAction(action, id, button) {
    if (action === "delete" && !confirm("Permanently delete this submission and its uploaded files?")) return;
    if (action === "reject") {
      const note = prompt("Optional note for the participant (visible to admins only):", "");
      if (note === null) return; // cancelled
      await fetch(`/admin/api/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
    } else if (action === "approve") {
      await fetch(`/admin/api/submissions/${id}/approve`, { method: "POST" });
    } else if (action === "delete") {
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
    el("filterStatus").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadSubmissions();
    });
    el("searchBox").addEventListener("input", (e) => {
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
  });
})();
