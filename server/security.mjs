import { scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { Buffer } from "node:buffer";
export const digest = (x) => createHash("sha256").update(x).digest("hex");
export function verifyPin(pin, verifier) {
  if (!/^\d{4,12}$/.test(pin || "")) return false;
  const [salt, hash] = String(verifier || "").split(":");
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  return timingSafeEqual(scryptSync(pin, salt, 64), Buffer.from(hash, "hex"));
}
export function enquiry(x) {
  if (!x || typeof x !== "object") throw Error("Invalid enquiry.");
  const out = {};
  for (const [k, n] of Object.entries({
    name: 100,
    email: 254,
    company: 150,
    description: 5000,
    features: 2000,
    service: 200,
    timeline: 100,
    budget: 100,
  })) {
    if (typeof x[k] !== "string" || x[k].length > n)
      throw Error("Please check your " + k + ".");
    out[k] = x[k].trim();
  }
  if (
    !out.name ||
    out.description.length < 20 ||
    !out.service ||
    !/^\S+@\S+\.\S+$/.test(out.email) ||
    x.consent !== true
  )
    throw Error(
      "Name, valid email, project description and consent are required.",
    );
  return { ...out, consent: true };
}
export const safeUrl = (x) =>
  typeof x === "string" &&
  ((x.startsWith("/") && !x.startsWith("//")) || /^https:\/\//.test(x));
export function validateSite(s) {
  if (!s || typeof s !== "object" || JSON.stringify(s).length > 150000)
    throw Error("Invalid content.");
  if (
    !["silver", "gold", "dark"].includes(s.defaultTheme) ||
    !Array.isArray(s.projects) ||
    !Array.isArray(s.services) ||
    !Array.isArray(s.faqs)
  )
    throw Error("Invalid site configuration.");
  for (const k of [
    "headline",
    "intro",
    "about",
    "email",
    "instagram",
    "knowledge",
    "seoTitle",
    "seoDescription",
  ])
    if (typeof s[k] !== "string" || s[k].length > 10000)
      throw Error("Invalid " + k);
  if (!/^\S+@\S+\.\S+$/.test(s.email) || !/^https:\/\//.test(s.instagram))
    throw Error("Invalid contact information.");
  const slugs = new Set();
  if (
    !s.services.length ||
    typeof s.introEnabled !== "boolean" ||
    typeof s.assistantEnabled !== "boolean"
  )
    throw Error("Invalid site settings.");
  for (const service of s.services) {
    for (const key of ["name", "description", "items"])
      if (typeof service[key] !== "string" || service[key].length > 10000)
        throw Error("Invalid service.");
  }
  for (const faq of s.faqs)
    if (typeof faq.q !== "string" || typeof faq.a !== "string")
      throw Error("Invalid FAQ.");
  for (const p of s.projects) {
    if (
      !/^[a-z0-9-]+$/.test(p.slug) ||
      slugs.has(p.slug) ||
      !/^https:\/\//.test(p.url) ||
      !safeUrl(p.image) ||
      !safeUrl(p.mobile) ||
      !Array.isArray(p.features) ||
      !Number.isFinite(p.order)
    )
      throw Error("Invalid project data.");
    slugs.add(p.slug);
    for (const k of [
      "name",
      "short",
      "category",
      "kind",
      "color",
      "headline",
      "summary",
      "story",
      "note",
    ])
      if (typeof p[k] !== "string") throw Error("Missing project " + k);
  }
  return s;
}
