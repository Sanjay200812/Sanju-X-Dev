import localHandler from "../server/handler.mjs";

export default async function handler(req, res) {
  const urlPath = new URL(req.url, "http://local").pathname;

  // Requirement 4: Ensure email sending and transactional operations run in a compatible
  // Node.js server environment with outbound TCP/TLS socket support on port 465 (Gmail SMTP).
  // Deno Deploy / Edge sandboxes restrict raw outbound SMTP sockets; Vercel Serverless (Node.js)
  // has full native support for Nodemailer SSL/TLS connections to smtp.gmail.com:465.
  const isServerlessSensitiveEndpoint =
    urlPath.startsWith("/api/enquiries") ||
    urlPath.startsWith("/api/spideyy") ||
    urlPath.startsWith("/api/chat");

  const hasSmtpConfigured = Boolean(
    process.env.SMTP_USER || process.env.SMTP_PASS || process.env.SMTP_HOST
  );

  if (
    !process.env.STUDIO_EDGE_URL ||
    isServerlessSensitiveEndpoint ||
    hasSmtpConfigured ||
    process.env.USE_LOCAL_HANDLER === "true"
  ) {
    return localHandler(req, res);
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const allowed = [
    process.env.SITE_URL,
    process.env.VERCEL_URL && "https://" + process.env.VERCEL_URL,
  ].filter(Boolean);
  if (req.method === "POST" && !allowed.includes(req.headers.origin)) {
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
        origin: process.env.SITE_URL || allowed[0],
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
