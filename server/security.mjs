import {
  scryptSync,
  timingSafeEqual,
  createHash,
  randomBytes,
} from "node:crypto";
import { Buffer } from "node:buffer";

export const digest = (x) => createHash("sha256").update(x).digest("hex");

/**
 * Creates a salted scrypt verifier for a high-entropy secret code or passphrase.
 * Requires at least 8 characters.
 */
export function createSecretVerifier(code) {
  if (typeof code !== "string" || code.trim().length < 8 || code.length > 128) {
    throw Error("Secret code must be a secure code or passphrase of at least 8 characters.");
  }
  const salt = randomBytes(24).toString("hex");
  return salt + ":" + scryptSync(code, salt, 64).toString("hex");
}

/**
 * Legacy PIN compatibility: accepts 4-12 digits or passes through to high-entropy verifier.
 */
export function createPinVerifier(pin) {
  if (typeof pin === "string" && /^\d{4,12}$/.test(pin)) {
    const salt = randomBytes(24).toString("hex");
    return salt + ":" + scryptSync(pin, salt, 64).toString("hex");
  }
  return createSecretVerifier(pin);
}

/**
 * Verifies a supplied secret code or PIN against a salted scrypt verifier.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function verifySecret(code, verifier) {
  if (!code || typeof code !== "string") return false;
  const [salt, hash] = String(verifier || "").split(":");
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  try {
    return timingSafeEqual(scryptSync(code, salt, 64), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export const verifyPin = verifySecret;

/**
 * Atomic Lockout Management:
 * Checks if a specific authentication scope (e.g., 'code:owner', 'password:owner') is locked out.
 */
export async function getLockoutStatus(client, scope) {
  if (!client) return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
  try {
    const { data: row, error } = await client
      .from("studio_lockouts")
      .select("failed_attempts, locked_until")
      .eq("scope", scope)
      .maybeSingle();

    if (error || !row) return { locked: false, remainingSeconds: 0, failedAttempts: 0 };

    if (row.locked_until) {
      const remainingMs = new Date(row.locked_until).getTime() - Date.now();
      if (remainingMs > 0) {
        return {
          locked: true,
          remainingSeconds: Math.ceil(remainingMs / 1000),
          failedAttempts: row.failed_attempts || 0,
        };
      }
      // Lockout period has elapsed: clear expired lockout
      await clearLockout(client, scope);
      return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
    }

    return { locked: false, remainingSeconds: 0, failedAttempts: row.failed_attempts || 0 };
  } catch {
    return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
}

/**
 * Records a failed attempt for a scope. If attempts reach maxAttempts (default 3),
 * locks the scope for lockoutMinutes (default 3 minutes).
 */
export async function recordFailedAttempt(client, scope, maxAttempts = 3, lockoutMinutes = 3) {
  if (!client) return { locked: false, remainingSeconds: 0, failedAttempts: 1 };
  try {
    const current = await getLockoutStatus(client, scope);
    const newAttempts = current.failedAttempts + 1;
    const shouldLock = newAttempts >= maxAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
      : null;

    await client.from("studio_lockouts").upsert({
      scope,
      failed_attempts: shouldLock ? 0 : newAttempts,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    });

    return {
      locked: shouldLock,
      remainingSeconds: shouldLock ? lockoutMinutes * 60 : 0,
      failedAttempts: shouldLock ? maxAttempts : newAttempts,
    };
  } catch {
    return { locked: false, remainingSeconds: 0, failedAttempts: 1 };
  }
}

/**
 * Resets lockout and failed attempts for a scope on successful authentication.
 */
export async function clearLockout(client, scope) {
  if (!client) return;
  try {
    await client.from("studio_lockouts").delete().eq("scope", scope);
  } catch {
    /* ignore deletion errors */
  }
}

export function enquiry(x) {
  if (!x || typeof x !== "object") throw Error("Invalid enquiry.");
  const out = {};
  const limits = {
    name: 100,
    email: 254,
    company: 150,
    description: 5000,
    service: 200,
    timeline: 100,
    budget: 100,
    phone: 40,
    whatsapp: 40,
    preferred_contact: 40,
    city: 100,
    country: 100,
    website_url: 300,
  };

  for (const [k, maxLen] of Object.entries(limits)) {
    if (x[k] !== undefined && x[k] !== null) {
      if (typeof x[k] !== "string" || x[k].length > maxLen) {
        throw Error("Please check your " + k + ".");
      }
      out[k] = x[k].trim();
    } else {
      out[k] = "";
    }
  }

  if (Array.isArray(x.features)) {
    if (x.features.length > 50) throw Error("Too many features specified.");
    for (const f of x.features) {
      if (typeof f !== "string" || f.length > 100) throw Error("Please check your features.");
    }
    out.features = x.features.map((f) => f.trim());
  } else if (typeof x.features === "string") {
    if (x.features.length > 2000) throw Error("Please check your features.");
    out.features = x.features.trim();
  } else {
    out.features = "";
  }

  if (Array.isArray(x.categories)) {
    if (x.categories.length > 50) throw Error("Too many categories specified.");
    for (const c of x.categories) {
      if (typeof c !== "string" || c.length > 100) throw Error("Please check your categories.");
    }
    out.categories = x.categories.map((c) => c.trim());
  } else if (typeof x.categories === "string") {
    if (x.categories.length > 1000) throw Error("Please check your categories.");
    out.categories = x.categories.trim() ? [x.categories.trim()] : [];
  } else {
    out.categories = [];
  }

  out.is_individual = Boolean(x.is_individual);

  if (
    !out.name ||
    out.description.length < 10 ||
    !out.service ||
    !/^\S+@\S+\.\S+$/.test(out.email) ||
    x.consent !== true
  ) {
    throw Error(
      "Name, valid email, project description and consent are required.",
    );
  }

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
