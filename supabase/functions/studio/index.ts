import { createHash } from "node:crypto";
import handler, { configureEnvironment } from "../../../server/handler.mjs";

const settings = Deno.env.toObject();
settings.SUPABASE_SERVICE_ROLE_KEY ||= JSON.parse(
  settings.SUPABASE_SECRET_KEYS || "{}",
).default;
settings.VERCEL = "1";
settings.SITE_URL ||=
  "https://sanju-x-dev-git-sanju-x-dev-premi-3dfbab-sanjay200812s-projects.vercel.app";
settings.RATE_LIMIT_SALT ||= createHash("sha256")
  .update(settings.SUPABASE_SERVICE_ROLE_KEY + "studio-limits")
  .digest("hex");
configureEnvironment(settings);

Deno.serve(async (request: Request) => {
  const headers = Object.fromEntries(request.headers);
  headers.authorization = headers["x-owner-authorization"] || "";
  const path = new URL(request.url).pathname;
  let body;
  if (request.method === "POST") {
    const raw = await request.text();
    if (raw.length > 4400000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    body = raw || "{}";
  }
  let status = 200;
  let output = "";
  const responseHeaders = new Headers();
  await handler(
    {
      url: path.slice(path.indexOf("/api/")),
      method: request.method,
      headers,
      body,
    },
    {
      set statusCode(value: number) {
        status = value;
      },
      setHeader(name: string, value: string) {
        responseHeaders.set(name, value);
      },
      end(value: string) {
        output = value;
      },
    },
  );
  return new Response(output, { status, headers: responseHeaders });
});
