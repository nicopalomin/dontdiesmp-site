const form = document.getElementById("applyForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

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

    // Turnstile token is provided in formData under "cf-turnstile-response"
    if (!payload["cf-turnstile-response"]) {
      setStatus("Please complete the anti-bot check.");
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
      setStatus(data?.error || "Something went wrong. Please try again.");
      submitBtn.disabled = false;
      return;
    }

    form.reset();
    setStatus("Your response has been recorded ✅");
  } catch (err) {
    setStatus("Network error. Please try again.");
    submitBtn.disabled = false;
  }
});
