const form = document.getElementById("applyForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const yearEl = document.getElementById("year");

if (yearEl) yearEl.textContent = new Date().getFullYear();

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

// Copy Server IP
document.querySelectorAll(".server-ip__value").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const ip = btn.dataset.ip || "play.dontdiesmp.com";
    try {
      await navigator.clipboard.writeText(ip);
      const label = btn.querySelector(".pill__label");
      const original = label ? label.textContent : "";
      if (label) label.textContent = "Copied!";
      btn.disabled = true;
      setTimeout(() => {
        if (label) label.textContent = original || "Server IP";
        btn.disabled = false;
      }, 1100);
    } catch {
      // Fallback
      const temp = document.createElement("input");
      temp.value = ip;
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      alert("Copied: " + ip);
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

    // Turnstile token is required
    if (!payload["cf-turnstile-response"]) {
      setStatus("Please complete the anti-bot check and try again.");
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
    setStatus("Application submitted ✅ Join Discord for whitelist updates.");
  } catch {
    setStatus("Network error. Please refresh and try again.");
    submitBtn.disabled = false;
  }
});