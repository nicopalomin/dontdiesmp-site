const form = document.getElementById("applyForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const yearEl = document.getElementById("year");

if (yearEl) yearEl.textContent = new Date().getFullYear();

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

/**
 * Click-to-copy Server IP
 * Expects a button like:
 * <button class="server-ip__value" data-ip="play.dontdiesmp.com">play.dontdiesmp.com</button>
 */
document.querySelectorAll(".server-ip__value").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const ip = btn.dataset.ip || btn.textContent.trim();
    if (!ip) return;

    // Prefer modern clipboard API
    try {
      await navigator.clipboard.writeText(ip);
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);
      return;
    } catch {
      // Fallback for older browsers / permissions
      try {
        const temp = document.createElement("input");
        temp.value = ip;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        alert("Copied: " + ip);
      } catch {
        alert("Copy failed. Server IP: " + ip);
      }
    }
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");
  submitBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Turnstile token
    if (!payload["cf-turnstile-response"]) {
      setStatus("Please complete the anti-bot check (Turnstile) and try again.");
      submitBtn.disabled = false;
      return;
    }

    // Terms checkbox (required by HTML, but keep a friendly message)
    if (!payload.agree) {
      setStatus("Please agree to the Terms of Service to continue.");
      submitBtn.disabled = false;
      return;
    }

    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.error || `Submission failed (HTTP ${res.status}).`);
      submitBtn.disabled = false;
      return;
    }

    form.reset();
    setStatus("Your response has been recorded ✅ (We’ll review it soon!)");
  } catch {
    setStatus("Network error. Please refresh and try again.");
    submitBtn.disabled = false;
  }
});