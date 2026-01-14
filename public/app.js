const form = document.getElementById("applyForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

document.getElementById("year").textContent = new Date().getFullYear();

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

    // Turnstile token comes in under this name:
    const token = payload["cf-turnstile-response"];
    if (!token) {
      setStatus("Please complete the anti-bot check (Turnstile) and try again.");
      submitBtn.disabled = false;
      return;
    }

    // Must accept Terms
    if (!payload.agree) {
      setStatus("Please agree to the Terms of Service to continue.");
      submitBtn.disabled = false;
      return;
    }

    // Send to same-origin API (recommended once your Worker routing is correct)
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Show server-provided error if available
      const msg = data?.error || `Submission failed (HTTP ${res.status}).`;
      setStatus(msg);
      submitBtn.disabled = false;
      return;
    }

    form.reset();
    setStatus("Your response has been recorded ✅ (We’ll review it soon!)");
  } catch (err) {
    setStatus("Network error. Please refresh and try again.");
    submitBtn.disabled = false;
  }
});
