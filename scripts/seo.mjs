import fs from "node:fs/promises";
import defaults from "../server/seed.json" with { type: "json" };

let seed = defaults;
if (process.env.STUDIO_EDGE_URL && process.env.STUDIO_EDGE_ANON_KEY) {
  try {
    const response = await fetch(process.env.STUDIO_EDGE_URL + "/api/site", {
      headers: { Authorization: "Bearer " + process.env.STUDIO_EDGE_ANON_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      seed = (await response.json()).site;
    }
  } catch {
    /* fallback to local seed defaults */
  }
}

const html = await fs.readFile("dist/index.html", "utf8");
const escape = (s) =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const isPreview = process.env.VERCEL_ENV === "preview";
const origin =
  (process.env.SITE_URL && !process.env.SITE_URL.includes("127.0.0.1") && !process.env.SITE_URL.includes("localhost"))
    ? process.env.SITE_URL.replace(/\/$/, "")
    : (process.env.VERCEL_URL && !isPreview
        ? "https://" + process.env.VERCEL_URL
        : "https://sanju-x-dev.vercel.app");

const pages = [
  ["", "Websites with distinction", seed.seoDescription],
  ["work", "Our Work — Five Selected Case Studies", "Explore live websites and web applications built by SANJU X DEV including StarX Live, TicketX, StarX Connect, AudioX and Yuva Shakti."],
  ["about", "About the Business — SANJU X DEV", seed.about],
  ["services", "Services — Design & Digital Development", "Web development, UI/UX design, custom web applications, e-commerce storefronts, and interactive digital experiences."],
  ["contact", "Start a Project — SANJU X DEV", "Submit a project brief to start a conversation about tailored web development and design for your business."],
  ["track", "Track Project — SANJU X DEV", "Check live project status, milestones, and development updates for your SANJU X DEV project."],
  ["privacy", "Privacy, Clearly — SANJU X DEV", "Learn how customer enquiries and visitor privacy are respected and stored securely at SANJU X DEV."],
  ...seed.projects.map((p) => [
    "work/" + p.slug,
    p.name,
    p.summary + " " + p.headline,
    p,
  ]),
];

// Generate pre-rendered static routes with rich SEO metadata
for (const [path, title, desc, projectData] of pages) {
  let out = html.replace(
    /<title>.*?<\/title>/,
    "<title>" + escape(title) + " — SANJU X DEV</title>",
  );

  const canonicalUrl = origin + (path ? "/" + path : "/");
  const imageUrl = projectData?.image
    ? (projectData.image.startsWith("http") ? projectData.image : origin + projectData.image)
    : origin + "/media/official-logo.png";

  const robotsTag = isPreview
    ? '<meta name="robots" content="noindex,nofollow"/>'
    : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>';

  // Structured Data Schema.org
  let structuredData = "";
  if (!path) {
    // Homepage: Organization + ProfessionalService
    structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "name": "SANJU X DEV",
      "url": origin + "/",
      "logo": origin + "/media/official-logo.png",
      "image": origin + "/media/official-logo.png",
      "description": seed.seoDescription,
      "email": "sanjuxdev27@gmail.com",
      "sameAs": [
        "https://instagram.com/sanju_x_dev/",
        "https://github.com/Sanjay200812/Sanju-X-Dev"
      ]
    });
  } else if (projectData) {
    // Project case study: CreativeWork
    structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": projectData.name,
      "headline": projectData.headline,
      "description": projectData.summary,
      "url": canonicalUrl,
      "image": imageUrl,
      "creator": {
        "@type": "Person",
        "name": "Sanjay",
        "jobTitle": "Digital Designer & Web Developer"
      }
    });
  }

  const meta =
    `<meta name="description" content="${escape(desc)}"/>` +
    robotsTag +
    `<link rel="canonical" href="${canonicalUrl}"/>` +
    `<meta property="og:title" content="${escape(title)} — SANJU X DEV"/>` +
    `<meta property="og:description" content="${escape(desc)}"/>` +
    `<meta property="og:type" content="website"/>` +
    `<meta property="og:url" content="${canonicalUrl}"/>` +
    `<meta property="og:image" content="${imageUrl}"/>` +
    `<meta property="og:site_name" content="SANJU X DEV"/>` +
    `<meta name="twitter:card" content="summary_large_image"/>` +
    `<meta name="twitter:title" content="${escape(title)} — SANJU X DEV"/>` +
    `<meta name="twitter:description" content="${escape(desc)}"/>` +
    `<meta name="twitter:image" content="${imageUrl}"/>` +
    (structuredData ? `<script type="application/ld+json">${structuredData}</script>` : "");

  out = out.replace("</head>", meta + "</head>");
  await fs.mkdir("dist/" + path, { recursive: true });
  await fs.writeFile("dist/" + (path ? path + "/" : "") + "index.html", out);
}

// Generate private /spideyy entry with strict noindex
const spideyyHtml = html.replace(
  /<title>.*?<\/title>/,
  "<title>spideyy — Private Access — SANJU X DEV</title>",
).replace(
  "</head>",
  '<meta name="robots" content="noindex,nofollow,noarchive"/><link rel="canonical" href="' + origin + '/spideyy"/></head>'
);
await fs.mkdir("dist/spideyy", { recursive: true });
await fs.writeFile("dist/spideyy/index.html", spideyyHtml);

// Generate robots.txt
const robotsTxt = isPreview
  ? "User-agent: *\nDisallow: /\n"
  : `User-agent: *
Allow: /
Disallow: /spideyy
Disallow: /admin
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
await fs.writeFile("dist/robots.txt", robotsTxt);

// Generate sitemap.xml for public pages only
const sitemapXml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages
    .map(([p]) => `  <url>\n    <loc>${origin}${p ? "/" + p : "/"}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${p === "" ? "1.0" : p.startsWith("work/") ? "0.8" : "0.7"}</priority>\n  </url>`)
    .join("\n") +
  "\n</urlset>";

await fs.writeFile("dist/sitemap.xml", sitemapXml);
console.log("SEO export complete: routes, robots.txt, and sitemap.xml generated successfully.");
