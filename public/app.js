const form = document.getElementById("applyForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const yearEl = document.getElementById("year");

if (yearEl) yearEl.textContent = new Date().getFullYear();

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

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
