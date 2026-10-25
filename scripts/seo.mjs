import fs from "node:fs/promises";
import seed from "../server/seed.json" with { type: "json" };
const html = await fs.readFile("dist/index.html", "utf8");
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const pages = [
  ["", "Websites with distinction"],
  ["work", "Our Work"],
  ["about", "About the Business"],
  ["services", "Services"],
  ["contact", "Start a Project"],
  ["privacy", "Privacy"],
  ...seed.projects.map((p) => ["work/" + p.slug, p.name]),
];
const origin =
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "");
for (const [path, title] of pages) {
  let out = html.replace(
    /<title>.*?<\/title>/,
    "<title>" + escape(title) + " — SANJU X DEV</title>",
  );
  const meta =
    '<meta property="og:title" content="' +
    escape(title) +
    ' — SANJU X DEV"/><meta property="og:description" content="' +
    escape(seed.seoDescription) +
    '"/>' +
    (origin
      ? '<meta property="og:image" content="' +
        origin +
        '/media/official-logo.webp"/><link rel="canonical" href="' +
        origin +
        "/" +
        path +
        '"/>'
      : "") +
    '<meta name="robots" content="noindex,nofollow"/>';
  out = out.replace("</head>", meta + "</head>");
  await fs.mkdir("dist/" + path, { recursive: true });
  await fs.writeFile("dist/" + (path ? path + "/" : "") + "index.html", out);
}
await fs.writeFile("dist/robots.txt", "User-agent: *\nDisallow: /\n");
await fs.writeFile(
  "dist/sitemap.xml",
  '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    (origin
      ? pages
          .map(([p]) => "<url><loc>" + origin + "/" + p + "</loc></url>")
          .join("")
      : "") +
    "</urlset>",
);
