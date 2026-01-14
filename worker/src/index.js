addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return handleOptions(request);

  if (url.pathname !== "/api/apply") {
    return json({ error: "Not found" }, 404);
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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

  const email = (body.email || "").trim();
  const minecraft = (body.minecraft || "").trim();
  const discord = (body.discord || "").trim();
  const reddit = (body.reddit || "").trim();
  const notifyEmail = (body.notifyEmail || "").trim();
  const foundVia = (body.foundVia || "").trim();
  const token = (body["cf-turnstile-response"] || "").trim();

  if (!email || !minecraft || !foundVia) return json({ error: "Missing required fields." }, 400);

  if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraft)) {
    return json({ error: "Invalid Minecraft username." }, 400);
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email." }, 400);
  }

  if (foundVia.length > 500) return json({ error: "Message too long." }, 400);

  // Turnstile verify
  const ok = await verifyTurnstile(token, TURNSTILE_SECRET, ip);
  if (!ok) return json({ error: "Anti-bot verification failed." }, 403);

  // Discord webhook payload
  const now = new Date().toISOString();
  const msg = {
    username: "Whitelist Bot",
    content: "New whitelist application received ✅",
    embeds: [
      {
        title: `Application: ${minecraft}`,
        fields: [
          { name: "Minecraft", value: minecraft, inline: true },
          { name: "Email", value: email, inline: true },
          { name: "Discord", value: discord || "(none)", inline: true },
          { name: "Reddit", value: reddit || "(none)", inline: true },
          { name: "Notify Email", value: notifyEmail || "(none)", inline: true },
          { name: "Found via", value: foundVia || "(none)", inline: false },
          { name: "IP", value: ip, inline: true },
          { name: "User-Agent", value: ua.slice(0, 120) || "(none)", inline: false },
          { name: "Time (UTC)", value: now, inline: true },
        ],
      },
    ],
  };

  const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });

  if (!discordRes.ok) {
    return json({ error: "Failed to notify moderators." }, 502);
  }

  return json({ ok: true }, 200);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": new URL(request.url).origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

// Secrets are
