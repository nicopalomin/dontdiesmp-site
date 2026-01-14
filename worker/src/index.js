addEventListener("fetch", (event) => {
  event.respondWith(router(event.request));
});

async function router(request) {
  try {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return handleOptions(request);

    if (url.pathname !== "/api/apply") return json({ error: "Not found" }, 404);

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Expected application/json" }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ua = request.headers.get("User-Agent") || "";

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const minecraft = (body.minecraft || "").trim();
    const foundVia = (body.foundVia || "").trim(); // optional now
    const discord = (body.discord || "").trim();
    const reddit = (body.reddit || "").trim();
    const email = (body.email || "").trim();
    const token = (body["cf-turnstile-response"] || "").trim();

    // Only minecraft is required
    if (!minecraft) {
      return json({ error: "Missing required fields." }, 400);
    }

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraft)) {
      return json({ error: "Invalid Minecraft username." }, 400);
    }

    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return json({ error: "Invalid email." }, 400);
    }

    if (foundVia && foundVia.length > 500) {
      return json({ error: "Message too long." }, 400);
    }

    // Secrets (safe access)
    const turnstileSecret =
      typeof TURNSTILE_SECRET === "undefined" ? "" : TURNSTILE_SECRET;

    const discordWebhookUrl =
      typeof DISCORD_WEBHOOK_URL === "undefined" ? "" : DISCORD_WEBHOOK_URL;

    if (!turnstileSecret) {
      return json({ error: "Server misconfigured: TURNSTILE_SECRET missing." }, 500);
    }
    if (!discordWebhookUrl) {
      return json({ error: "Server misconfigured: DISCORD_WEBHOOK_URL missing." }, 500);
    }

    // Turnstile verify
    const ok = await verifyTurnstile(token, turnstileSecret, ip);
    if (!ok) return json({ error: "Anti-bot verification failed." }, 403);

    // Discord payload
    const now = new Date().toISOString();
    const msg = {
      username: "Whitelist Bot",
      content: "New whitelist application received ✅",
      embeds: [
        {
          title: `Application: ${minecraft}`,
          fields: [
            { name: "Minecraft", value: minecraft, inline: true },
            { name: "Email", value: email || "(none)", inline: true },
            { name: "Discord", value: discord || "(none)", inline: true },
            { name: "Reddit", value: reddit || "(none)", inline: true },
            { name: "Found via", value: foundVia || "(none)", inline: false },
            { name: "IP", value: ip, inline: true },
            { name: "User-Agent", value: (ua || "(none)").slice(0, 120), inline: false },
            { name: "Time (UTC)", value: now, inline: true },
          ],
        },
      ],
    };

    const discordRes = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text().catch(() => "");
      console.error("Discord webhook error:", discordRes.status, text);
      return json(
        {
          error: "Failed to notify moderators.",
          detail: `Discord HTTP ${discordRes.status}: ${text.slice(0, 200)}`,
        },
        502
      );
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Worker crashed:", err && (err.stack || err));
    return json({ error: "Worker crashed", detail: String(err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function handleOptions(request) {
  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return false;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip && ip !== "unknown") formData.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return !!data?.success;
}
