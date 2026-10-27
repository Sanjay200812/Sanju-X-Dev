import localHandler from "../server/handler.mjs";
import { isAllowedOrigin } from "../server/security.mjs";

export default async function handler(req, res) {
  const urlPath = new URL(req.url, "http://local").pathname;

  // Sensitive serverless endpoints that MUST run in compatible Node.js serverless environment
  // (Gmail SMTP port 465 SSL/TLS, OpenAI conversational intelligence, database operations)
  const isServerlessSensitiveEndpoint =
    urlPath.startsWith("/api/enquiry") ||
    urlPath.startsWith("/api/enquiries") ||
    urlPath.startsWith("/api/spideyy") ||
    urlPath.startsWith("/api/chat") ||
    urlPath.startsWith("/api/track") ||
    urlPath.startsWith("/api/admin");

  const hasSmtpConfigured = Boolean(
    process.env.SMTP_USER || process.env.SMTP_PASS || process.env.SMTP_HOST
  );

  // If STUDIO_EDGE_URL is not set, or this is a serverless sensitive endpoint, or SMTP is configured,
  // or USE_LOCAL_HANDLER is set, use the robust localHandler.
  if (
    !process.env.STUDIO_EDGE_URL ||
    isServerlessSensitiveEndpoint ||
    hasSmtpConfigured ||
    process.env.USE_LOCAL_HANDLER === "true"
  ) {
    return localHandler(req, res);
  }

  // Set standard CORS & security headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  const origin = req.headers.origin;
  const originAllowed = isAllowedOrigin(origin, process.env);

  if (origin && originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-owner-authorization"
    );
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === "POST" && !originAllowed) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: "Request origin is not allowed." }));
  }

  try {
    const response = await fetch(process.env.STUDIO_EDGE_URL + urlPath, {
      method: req.method,
      headers: {
        Authorization: "Bearer " + process.env.STUDIO_EDGE_ANON_KEY,
        "Content-Type": "application/json",
        "x-owner-authorization": req.headers.authorization || "",
        cookie: req.headers.cookie || "",
        origin: origin || process.env.SITE_URL || "https://sanju-x-dev.vercel.app",
        "x-forwarded-for": req.headers["x-forwarded-for"] || "unknown",
      },
      body:
        req.method === "POST"
          ? typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body || {})
          : undefined,
      signal: AbortSignal.timeout(25000),
    });
    res.statusCode = response.status;
    const cookie = response.headers.get("set-cookie");
    if (cookie) res.setHeader("Set-Cookie", cookie);
    res.end(await response.text());
  } catch {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error:
          "Service temporarily unavailable. Please email sanjuxdev27@gmail.com.",
      }),
    );
  }
}
