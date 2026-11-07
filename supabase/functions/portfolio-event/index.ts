import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedEvents = new Set([
  "page_view",
  "project_view",
  "project_click",
  "music_download",
]);
const allowedSources = new Set([
  "direct",
  "search",
  "social",
  "referral",
  "other",
]);
const allowedDevices = new Set(["desktop", "mobile", "tablet", "other"]);
const allowedBrowsers = new Set([
  "Chrome",
  "Safari",
  "Firefox",
  "Edge",
  "Opera",
  "Other",
]);
const allowedProjects = new Set([
  "tchatzsafe",
  "tchatz-klassio",
  "speedtype",
  "trinahook",
  "princeart",
  "tchatz-music",
]);

function response(body: unknown, status: number, origin: string) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      Vary: "Origin",
    },
  });
}

Deno.serve(async (request) => {
  const siteOrigin = Deno.env.get("SITE_ORIGIN") || "";
  const requestOrigin = request.headers.get("origin") || "";
  if (!siteOrigin || requestOrigin !== siteOrigin) {
    return new Response("Forbidden", { status: 403 });
  }
  if (request.method === "OPTIONS") return response({}, 204, siteOrigin);
  if (request.method !== "POST")
    return response({ error: "Method not allowed" }, 405, siteOrigin);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "Unsupported content type" }, 415, siteOrigin);
  }

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return response({ error: "Payload too large" }, 413, siteOrigin);
    payload = JSON.parse(raw);
  } catch {
    return response({ error: "Invalid JSON" }, 400, siteOrigin);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return response({ error: "Invalid event" }, 400, siteOrigin);
  }
  const eventType = String(payload.event_type || "");
  const sessionId = String(payload.session_id || "");
  const path = String(payload.path || "");
  const projectSlug =
    payload.project_slug == null ? null : String(payload.project_slug);
  if (
    !allowedEvents.has(eventType) ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(sessionId)
  ) {
    return response({ error: "Invalid event" }, 400, siteOrigin);
  }
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.length > 300
  ) {
    return response({ error: "Invalid path" }, 400, siteOrigin);
  }
  if (
    ["project_view", "project_click"].includes(eventType) &&
    (!projectSlug || !allowedProjects.has(projectSlug))
  ) {
    return response({ error: "Invalid project" }, 400, siteOrigin);
  }
  if (
    !["project_view", "project_click"].includes(eventType) &&
    projectSlug !== null
  ) {
    return response({ error: "Unexpected project" }, 400, siteOrigin);
  }

  const source = String(payload.referrer_source || "direct");
  const device = String(payload.device_category || "other");
  const browser = String(payload.browser || "Other");
  const domainRaw =
    payload.referrer_domain == null
      ? null
      : String(payload.referrer_domain).toLowerCase();
  const domain =
    domainRaw && /^[a-z0-9.-]{1,120}$/.test(domainRaw) ? domainRaw : null;
  if (
    !allowedSources.has(source) ||
    !allowedDevices.has(device) ||
    !allowedBrowsers.has(browser)
  ) {
    return response({ error: "Invalid metadata" }, 400, siteOrigin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Portfolio event collector is missing server configuration");
    return response({ error: "Collector unavailable" }, 503, siteOrigin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("portfolio_events").insert({
    event_type: eventType,
    session_id: sessionId,
    path,
    project_slug: projectSlug,
    referrer_source: source,
    referrer_domain: domain,
    device_category: device,
    browser,
  });
  if (error) {
    console.error(
      "Portfolio event insert failed",
      error.code || "database error",
    );
    return response({ error: "Event could not be recorded" }, 503, siteOrigin);
  }
  return response({ ok: true }, 202, siteOrigin);
});
