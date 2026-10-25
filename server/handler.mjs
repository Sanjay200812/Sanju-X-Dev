import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import process from "node:process";
import { Buffer } from "node:buffer";
import {
  digest,
  verifyPin,
  createPinVerifier,
  enquiry,
  validateSite,
  getLockoutStatus,
  recordFailedAttempt,
  clearLockout,
} from "./security.mjs";
import {
  sendEnquiryNotification,
  verifySmtpConnection,
  sendEmail,
  formatProjectAcceptedHtml,
  formatProgressUpdatedHtml,
  formatProjectCompletedHtml,
  formatProjectStatusChangeHtml,
} from "./email.mjs";
import seed from "./seed.json" with { type: "json" };

function calculateDaysRemainingIST(targetDateStr) {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayISTStr = istFormatter.format(now);
  const targetISTStr = istFormatter.format(target);

  const msPerDay = 1000 * 60 * 60 * 24;
  const dToday = new Date(todayISTStr + "T00:00:00Z");
  const dTarget = new Date(targetISTStr + "T00:00:00Z");
  const diffDays = Math.round((dTarget.getTime() - dToday.getTime()) / msPerDay);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
  } else if (diffDays === 0) {
    return "Due today";
  } else {
    return "Scheduled delivery date has passed — finalizing review";
  }
}

let runtimeEnvironment;
export const configureEnvironment = (values) => {
  runtimeEnvironment = values;
};
const env = () => runtimeEnvironment || process.env;

const aiStats = {
  date: new Date().toISOString().slice(0, 10),
  requestsToday: 0,
  errorsToday: 0,
  lastError: null,
  lastUsed: null,
  lastModel: null,
};

function getAiStats() {
  const today = new Date().toISOString().slice(0, 10);
  if (aiStats.date !== today) {
    aiStats.date = today;
    aiStats.requestsToday = 0;
    aiStats.errorsToday = 0;
    aiStats.lastError = null;
  }
  return aiStats;
}

function sanitizeAiError(err, key) {
  let msg = String(err?.message || err || "AI request failed");
  if (key && typeof key === "string" && key.length > 5) {
    msg = msg.split(key).join("[REDACTED]");
  }
  return msg;
}

function extractChatLinks(question, answer) {
  const links = [];
  const addedUrls = new Set();

  function addLink(label, url) {
    if (!url || addedUrls.has(url)) return;
    addedUrls.add(url);
    links.push({ label, url });
  }

  // 1. Markdown links from answer: [Label](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(answer)) !== null) {
    addLink(match[1].trim(), match[2].trim());
  }

  const textCombined = (question + " " + answer).toLowerCase();

  // 2. The 5 Official Website Categories recommendation links
  if (/e-commerce|ecommerce|online store|shopping cart|clothing shop|sell online|order online/i.test(textCombined)) {
    addLink("Start Your Project", "/contact?category=" + encodeURIComponent("E-Commerce Website"));
  } else if (/business website|corporate|company website|local business|lead gen/i.test(textCombined)) {
    addLink("Start Your Project", "/contact?category=" + encodeURIComponent("Business Website"));
  } else if (/portfolio|personal website|resume website|personal brand/i.test(textCombined)) {
    addLink("Start Your Project", "/contact?category=" + encodeURIComponent("Personal Portfolio"));
  } else if (/blog|content website|news|publishing|articles/i.test(textCombined)) {
    addLink("Start Your Project", "/contact?category=" + encodeURIComponent("Blog / Content Website"));
  } else if (/agency website|creative studio|creative agency/i.test(textCombined)) {
    addLink("Start Your Project", "/contact?category=" + encodeURIComponent("Agency Website"));
  }

  // 3. Project tracking queries
  if (/sxd-|track|tracking|project status|check my project/i.test(textCombined)) {
    addLink("Track My Project", "/track");
  }

  // 4. Portfolio / previous projects queries
  if (/previous project|past work|portfolio|case stud|starx|ticketx|audiox|yuva shakti/i.test(textCombined)) {
    addLink("Explore Our Work", "/work");
  }

  // 5. General project enquiry queries
  if (/contact|brief|enquiry|quote|hire|start a project|how do i start/i.test(textCombined)) {
    addLink("Start an Enquiry", "/contact");
  }

  return links.slice(0, 3);
}


function getSmtpConfig(e) {
  return {
    siteUrl: e.SITE_URL,
    smtpHost: e.SMTP_HOST,
    smtpPort: e.SMTP_PORT,
    smtpSecure: e.SMTP_SECURE,
    smtpUser: e.SMTP_USER,
    smtpPass: e.SMTP_PASS,
    fromEmail: e.SMTP_FROM_EMAIL,
    toEmail: e.OWNER_NOTIFICATION_EMAIL,
    resendApiKey: e.RESEND_API_KEY,
  };
}


const OWNER_UID = "3984ceee-869a-432f-a5dd-23eb615d234d";

const db = () => {
  const e = env();
  return e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
};

const fail = (status, message) => Object.assign(new Error(message), { status });

const checked = async (query) => {
  const r = await query;
  if (r.error)
    throw fail(
      503,
      "The database is not ready. Please contact the business by email.",
    );
  return r.data;
};

async function site(client) {
  if (!client) return seed;
  const rows = await checked(
    client.from("studio_content").select("data").eq("id", "site").maybeSingle(),
  );
  return rows?.data || seed;
}

async function rate(client, req, scope, max) {
  if (!env().RATE_LIMIT_SALT)
    throw fail(
      503,
      "Submission service needs configuration. Please email the business.",
    );
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
  ).split(",")[0].trim();
  const key = digest(
    env().RATE_LIMIT_SALT +
      scope +
      (scope.startsWith("pin:") || scope === "enquiry-global" ? "" : ip),
  );
  const allowed = await checked(
    client.rpc("studio_limit", { key_value: key, maximum: max, seconds: 3600 }),
  );
  if (!allowed) throw fail(429, "Too many attempts. Please try again later.");
}

async function owner(client, req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) throw fail(401, "Sign in to continue.");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user)
    throw fail(401, "Your session has expired. Sign in again.");
  if (data.user.id !== OWNER_UID)
    throw fail(403, "Owner access only.");

  let sessionId = "";
  try {
    sessionId = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ).session_id || "";
  } catch {
    sessionId = "";
  }

  return {
    id: data.user.id,
    token,
    session: sessionId,
  };
}

async function unlocked(client, req, user) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("studio_unlock="))
    ?.slice(14);
  if (!cookie) throw fail(403, "Enter your private verification code.");

  let query = client
    .from("studio_sessions")
    .select("*")
    .eq("hash", digest(cookie))
    .eq("owner_id", user.id)
    .gt("expires_at", new Date().toISOString());

  if (user.session) {
    query = query.eq("auth_session", user.session);
  }

  const row = await checked(query.maybeSingle());
  if (!row) throw fail(403, "Workspace locked. Verify your code again.");
}

async function audit(client, action) {
  try {
    if (client) {
      await checked(client.from("studio_audit").insert({ action }));
    }
  } catch {
    /* non-blocking audit */
  }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  const send = (code, body) => {
    res.statusCode = code;
    res.end(JSON.stringify(body));
  };

  try {
    const path = new URL(req.url, "http://local").pathname;
    const client = db();
    let body = {};

    if (req.method === "POST") {
      const origin = req.headers.origin;
      const permitted = [
        env().SITE_URL,
        env().VERCEL_URL ? "https://" + env().VERCEL_URL : null,
        "http://127.0.0.1:3100",
        "http://127.0.0.1:3101",
        "http://localhost:3100",
        "http://localhost:3101",
      ].filter(Boolean);

      if (!origin || !permitted.includes(origin))
        throw fail(403, "Request origin is not allowed.");

      if (req.body)
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      else {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 4400000) throw fail(413, "Request too large.");
        }
        body = raw ? JSON.parse(raw) : {};
      }
    }

    if (path === "/api/site" && req.method === "GET") {
      const s = await site(client);
      return send(200, {
        site: { ...s, projects: s.projects.filter((p) => p.published) },
        backendReady: !!client,
      });
    }

    if (path === "/api/enquiry" && req.method === "POST") {
      const data = enquiry(body);
      if (body.website) throw fail(400, "Unable to accept this submission.");
      if (!client)
        throw fail(
          503,
          "Enquiries are not connected yet. Please email sanjuxdev27@gmail.com.",
        );

      await rate(client, req, "enquiry", 5);
      await rate(client, req, "enquiry-global", 100);

      // Generate sequential tracking code SXD-001, SXD-002, etc.
      let trackingCode = "SXD-001";
      try {
        const { data: codeData, error: codeErr } = await client.rpc("studio_generate_tracking_code");
        if (!codeErr && codeData) {
          trackingCode = codeData;
        } else {
          const { count } = await client.from("studio_enquiries").select("id", { count: "exact", head: true });
          const nextNum = (count || 0) + 1;
          trackingCode = nextNum < 1000 ? `SXD-${String(nextNum).padStart(3, "0")}` : `SXD-${nextNum}`;
        }
      } catch {
        const nextNum = 1;
        trackingCode = `SXD-${String(nextNum).padStart(3, "0")}`;
      }

      const insertRecord = {
        data,
        tracking_code: trackingCode,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        preferred_contact: data.preferred_contact || "email",
        city: data.city || null,
        country: data.country || null,
        website_url: data.website_url || null,
        is_individual: Boolean(data.is_individual),
        status: "new",
        read: false,
        email_status: "pending",
      };

      let insertedId = null;
      try {
        const r = await client.from("studio_enquiries").insert(insertRecord).select("id").single();
        if (r.data?.id) insertedId = r.data.id;
      } catch {
        const r = await checked(
          client.from("studio_enquiries").insert({ data, status: "new", read: false, email_status: "pending" }).select("id").single(),
        );
        insertedId = r.id;
      }

      // Automatic Transactional Email Notifications via Resend (Owner & Customer)
      let emailStatus = "unconfigured";
      try {
        const emailResult = await sendEnquiryNotification({
          ...data,
          tracking_code: trackingCode,
        }, {
          siteUrl: env().SITE_URL,
          resendApiKey: env().RESEND_API_KEY,
          fromEmail: env().RESEND_FROM_EMAIL,
          toEmail: env().OWNER_NOTIFICATION_EMAIL || "sanjuxdev27@gmail.com",
        }, client);

        if (emailResult.success) {
          emailStatus = "sent";
          if (insertedId) {
            await client
              .from("studio_enquiries")
              .update({ email_status: "sent" })
              .eq("id", insertedId);
          }
          await audit(client, "Enquiry notification email sent via Resend (" + trackingCode + ")");
        } else if (!emailResult.skipped) {
          emailStatus = "failed";
          if (insertedId) {
            await client
              .from("studio_enquiries")
              .update({ email_status: "failed" })
              .eq("id", insertedId);
          }
          await audit(client, "Enquiry notification email failed: " + (emailResult.error || "unknown error"));
        }
      } catch {
        /* ensure customer enquiry submission is never failed by email errors */
      }

      return send(201, { saved: true, trackingCode, emailStatus });
    }

    if (path === "/api/track" && req.method === "POST") {
      if (!client)
        throw fail(503, "Tracking service is temporarily unavailable. Please email sanjuxdev27@gmail.com.");

      await rate(client, req, "track", 30);

      const action = body.action || "status";

      if (action === "verify") {
        const rawCode = String(body.trackingCode || "").trim().toUpperCase();
        const rawEmail = String(body.email || "").trim().toLowerCase();

        if (!/^SXD-\d+$/i.test(rawCode) || !/^\S+@\S+\.\S+$/.test(rawEmail)) {
          throw fail(400, "Please enter a valid Tracking ID (e.g. SXD-001) and your registered email address.");
        }

        let matched = false;

        try {
          const { data: projectRow } = await client
            .from("studio_projects")
            .select("id, tracking_code, client_email")
            .eq("tracking_code", rawCode)
            .maybeSingle();

          if (projectRow && projectRow.client_email?.toLowerCase() === rawEmail) {
            matched = true;
          }
        } catch {
          /* ignore */
        }

        if (!matched) {
          try {
            const { data: enquiryRows } = await client
              .from("studio_enquiries")
              .select("id, tracking_code, data")
              .eq("tracking_code", rawCode)
              .limit(1);

            const row = enquiryRows?.[0];
            if (row && (row.data?.email?.toLowerCase() === rawEmail || row.email?.toLowerCase() === rawEmail)) {
              matched = true;
            }
          } catch {
            /* ignore */
          }
        }

        if (!matched) {
          throw fail(404, "No project or enquiry was found matching this Tracking ID and Email combination. Please check your confirmation email.");
        }

        const token = randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000).toISOString();

        try {
          await client.from("studio_tracking_verifications").insert({
            tracking_code: rawCode,
            email: rawEmail,
            token,
            expires_at: expiresAt,
          });
        } catch {
          /* fallback */
        }

        return send(200, {
          verified: true,
          token,
          trackingCode: rawCode,
        });
      }

      if (action === "status") {
        const rawCode = String(body.trackingCode || "").trim().toUpperCase();
        const token = String(body.token || "").trim();

        if (!rawCode || !token) {
          throw fail(401, "Please verify your email address to view this project.");
        }

        let tokenValid = false;
        try {
          const { data: tokenRow } = await client
            .from("studio_tracking_verifications")
            .select("expires_at")
            .eq("tracking_code", rawCode)
            .eq("token", token)
            .maybeSingle();

          if (tokenRow && new Date(tokenRow.expires_at).getTime() > Date.now()) {
            tokenValid = true;
          }
        } catch {
          tokenValid = token.length >= 16;
        }

        if (!tokenValid && token.length < 16) {
          throw fail(401, "Your verification session has expired. Please verify your email again.");
        }

        let project = null;
        let enquiryRow = null;

        try {
          const pr = await client.from("studio_projects").select("*").eq("tracking_code", rawCode).maybeSingle();
          if (pr.data) project = pr.data;
        } catch {
          /* ignore */
        }

        try {
          const er = await client.from("studio_enquiries").select("*").eq("tracking_code", rawCode).maybeSingle();
          if (er.data) enquiryRow = er.data;
        } catch {
          /* ignore */
        }

        if (!project && !enquiryRow) {
          throw fail(404, "Project record not found.");
        }

        const defaultMilestones = [
          { name: "Enquiry Received & Scoping", completed: true },
          { name: "Requirements Confirmation & Proposal", completed: Boolean(project) },
          { name: "Core Architecture & Design Concept", completed: (project?.progress_pct || 0) >= 40 },
          { name: "Active Development & Feature Build", completed: (project?.progress_pct || 0) >= 75 },
          { name: "Quality Assurance & Responsive Testing", completed: (project?.progress_pct || 0) >= 90 },
          { name: "Production Deployment & Handover", completed: (project?.progress_pct || 0) === 100 },
        ];

        const daysRemaining = calculateDaysRemainingIST(project?.target_date);

        const statusLabels = {
          under_review: "Under Initial Review",
          new: "Under Initial Review",
          scope_confirmed: "Scope & Timeline Confirmed",
          "in-progress": "In Active Development",
          in_progress: "In Active Development",
          testing: "Quality & Responsive Testing",
          completed: "Completed & Delivered",
          closed: "Delivered",
          on_hold: "On Hold",
          declined: "Declined",
        };

        const currentStatusKey = project?.status || enquiryRow?.status || "under_review";
        const statusLabel = statusLabels[currentStatusKey] || "Under Review";

        const sanitized = {
          trackingCode: rawCode,
          title: project?.title || enquiryRow?.data?.company || (enquiryRow?.data?.name ? `${enquiryRow.data.name}'s Project` : "Client Project"),
          service: project?.service || enquiryRow?.data?.service || "Digital Development",
          status: currentStatusKey,
          statusLabel,
          progressPct: project?.progress_pct ?? (enquiryRow?.status === "new" ? 15 : 30),
          milestones: (Array.isArray(project?.milestones) && project.milestones.length > 0) ? project.milestones : defaultMilestones,
          startDate: project?.start_date || null,
          targetDate: project?.target_date || null,
          completedDate: project?.completed_date || null,
          daysRemaining: currentStatusKey === "completed" ? "Completed" : daysRemaining,
          publicUpdate: project?.public_update || (enquiryRow?.status === "new" ? "We have received your enquiry and are reviewing the technical requirements. We will be in touch shortly." : "Project is moving forward according to schedule."),
          publicUpdateTime: project?.public_update_time || enquiryRow?.created_at,
          liveUrl: project?.live_url || null,
          createdAt: enquiryRow?.created_at || project?.created_at,
        };

        return send(200, { project: sanitized });
      }

      throw fail(400, "Unknown tracking action.");
    }

    if (path === "/api/chat" && req.method === "POST") {
      if (
        typeof body.question !== "string" ||
        body.question.length > 1000 ||
        !body.question.trim()
      )
        throw fail(400, "Please enter a question under 1,000 characters.");

      const content = await site(client);
      const s = {
        ...content,
        projects: (content.projects || []).filter((p) => p.published),
      };

      if (content.assistantEnabled === false) {
        return send(200, {
          answer: "spideyy assistant is currently offline. You can share your project requirements directly through our Contact page.",
          mode: "offline",
          links: [{ label: "Start a Project Brief", url: "/contact" }],
        });
      }

      const rawQ = body.question.trim();
      const q = rawQ.toLowerCase();

      const openAiKey = (env().OPENAI_API_KEY || "").trim();
      const openAiModel = env().OPENAI_MODEL || "gpt-4o-mini";
      const isAiConfigured = Boolean(openAiKey && openAiKey.length > 5);

      let answer = "";
      let mode = "FAQ guide";
      let links = [];

      // -------------------------------------------------------------
      // 1. PRIMARY ENGINE: Real OpenAI API Conversational Intelligence
      // -------------------------------------------------------------
      if (isAiConfigured) {
        const stats = getAiStats();
        const dailyLimit = Number(content.aiDailyLimit || 100);

        if (client) {
          try {
            await rate(client, req, "chat", 30);
          } catch {}
        }

        if (stats.requestsToday < dailyLimit) {
          try {
            const history = Array.isArray(body.history) ? body.history : [];
            const historyMessages = history
              .slice(-8)
              .map((h) => ({
                role: h.role === "user" ? "user" : "assistant",
                content: String(h.text || h.content || "").slice(0, 600),
              }))
              .filter((m) => m.content);

            const systemPrompt =
              "You are spideyy, the intelligent, friendly, and authentic AI assistant for SANJU X DEV (modern web design and development studio led by Sanjay). " +
              "Sanjay's professional affiliation: Co-Founder at CodeXa Agency. " +
              "\n\nCONVERSATIONAL STYLE & INTELLIGENCE:" +
              "\n- Answer naturally, conversationally, and clearly. Avoid robotic, boilerplate, or repeated phrases." +
              "\n- Understand both English and mixed Telugu-English phrasing (e.g. 'naku website kavali', 'cost entha', 'ela start cheyali', 'clothing shop ki website kavali'). When the customer uses Telugu-English phrasing, respond warmly in friendly English addressing their specific needs." +
              "\n- Multi-turn memory: You have memory of earlier messages in the current chat. Understand follow-up questions (e.g. 'Can customers pay online?', 'What did I just ask you?', 'How much?')." +
              "\n- Ask useful clarification questions when a project idea is broad." +
              "\n\nRECOMMEND FROM THE 5 OFFICIAL WEBSITE CATEGORIES:" +
              "\n1. Personal Portfolio: For developers, designers, creators, artists, students, or personal brands (/contact?category=Personal%20Portfolio)." +
              "\n2. Blog / Content Website: For articles, stories, news, knowledge base, tutorials, or regular updates (/contact?category=Blog%20%2F%20Content%20Website)." +
              "\n3. Business Website: For companies, local businesses, services, and corporate websites focused on customer trust and enquiry generation (/contact?category=Business%20Website)." +
              "\n4. Agency Website: For creative agencies, studios, and multidisciplinary teams showcasing multi-service capabilities and client work (/contact?category=Agency%20Website)." +
              "\n5. E-Commerce Website: For clothing shops, retail stores, product sellers, or online shopping with product catalogues, shopping carts, WhatsApp ordering, and secure payments (UPI, cards, net banking) (/contact?category=E-Commerce%20Website)." +
              "\nRecommend website categories based on customer's actual business needs rather than keyword matching alone." +
              "\n\nPROJECT ENQUIRY INTEGRATION:" +
              "\nWhen a visitor describes their website idea, explain why the recommended category suits them, and invite them to 'Start Your Project' with the relevant category preselected. Never create an enquiry without explicit customer consent and submission." +
              "\n\nSTRICT TRACKING & PRIVACY RULES:" +
              "\nClients receive an SXD Tracking ID (e.g. SXD-001) upon submitting an enquiry. To track status, progress milestones, or countdown days, clients must visit /track and enter their Tracking ID and registered email. NEVER disclose private client names, emails, phone numbers, or unverified project details in chat. Direct all tracking questions to /track." +
              "\n\nSTRICT PRICING & TIMELINES RULES:" +
              "\nNever invent fixed price packages, delivery guarantees, or false quotes. Every project is scoped individually without arbitrary assumptions. Guide clients to /contact to share a brief for a tailored estimate." +
              "\n\nVERIFIED 5 PORTFOLIO PROJECTS (NO FALSE CLAIMS):" +
              "\n1. StarX Live (entertainment streaming), 2. TicketX (event/cinema booking application), 3. StarX Connect (digital NFC & virtual card), 4. AudioX (audio utility app), 5. Yuva Shakti (youth community portal). Direct visitors to /work for full case studies." +
              (content.knowledge ? "\n\nAPPROVED BUSINESS KNOWLEDGE:\n" + content.knowledge : "");

            const openAiBody = {
              model: openAiModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...historyMessages,
                { role: "user", content: rawQ },
              ],
              max_tokens: Number(content.aiMaxTokens || 450),
              temperature: 0.65,
            };

            const fetchImpl = env().OPENAI_FETCH || globalThis.fetch;
            const r = await fetchImpl("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + openAiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(openAiBody),
              signal: AbortSignal.timeout(18000),
            });

            if (r.ok) {
              const d = await r.json();
              const text = d.choices?.[0]?.message?.content?.trim();
              if (text) {
                answer = text;
                mode = "AI assistant";
                links = extractChatLinks(rawQ, text);
                stats.requestsToday++;
                stats.lastUsed = new Date().toISOString();
                stats.lastModel = openAiModel;
                return send(200, { answer, mode, links });
              }
            } else {
              const errData = await r.json().catch(() => ({}));
              const errMsg = errData.error?.message || `OpenAI API returned status ${r.status}`;
              stats.errorsToday++;
              stats.lastError = sanitizeAiError(errMsg, openAiKey);
            }
          } catch (err) {
            stats.errorsToday++;
            stats.lastError = sanitizeAiError(err.message, openAiKey);
          }
        } else {
          stats.lastError = "Daily request quota reached (" + dailyLimit + " requests). Operating in FAQ Guide mode.";
        }
      }

      // -------------------------------------------------------------
      // 2. SECONDARY ENGINE: Verified Rule-Based FAQ Guide Fallback
      // -------------------------------------------------------------
      mode = "FAQ guide";

      // Telugu-English mixed phrases
      const isTeluguMixed = /(kavali|entha|untundi|cheyagalara|naku|ela|baguntundi|eppudu|chudali|ivvandi|chestaru|cheyali|cheyadam)/i.test(q);

      // Check for specific project inquiries
      const project = s.projects.find(
        (p) => q.includes(p.short.toLowerCase()) || q.includes(p.slug),
      );

      // Check for specific services inquiries
      const serviceMatch = (s.services || []).find((srv) =>
        q.includes(srv.name.toLowerCase()) ||
        srv.name.toLowerCase().split(/\s+/).some((w) => w.length > 4 && q.includes(w)),
      );

      if (isTeluguMixed) {
        answer = "Namaste! SANJU X DEV can definitely build this for you. Whether you need a business website, online store, or custom application, we build it modern, mobile-friendly, and fast. You can share your project idea directly on our simple 2-step Contact page or email Sanjay at sanjuxdev27@gmail.com.";
        links.push({ label: "Start Your Project", url: "/contact" });
        links.push({ label: "Explore Our Work", url: "/work" });
      } else if (project) {
        answer = `${project.name}: ${project.summary} ${project.headline} Key features include: ${project.features.join(", ")}.`;
        links.push({ label: "View " + project.short + " Case Study", url: "/work/" + project.slug });
        links.push({ label: "Visit Live Site ↗", url: project.url });
      } else if (/(website for my shop|for my shop|for my store)/i.test(q) && !/clothing/i.test(q)) {
        answer = "A Business Website could work if you want to show your products and receive enquiries. If you want customers to pay and place orders online, an E-Commerce Website may be better.";
        links.push({ label: "Start With This Website Type", url: "/contact?category=" + encodeURIComponent("E-Commerce Website") });
        links.push({ label: "Start With Business Website", url: "/contact?category=" + encodeURIComponent("Business Website") });
      } else if (/(clothing|online shop|clothing shop|retail)/i.test(q)) {
        answer = "For a clothing shop or retail business where you want customers to browse items and place orders, an E-Commerce Website is the ideal choice. We build them with product catalogues, shopping carts, WhatsApp ordering, and secure payments (UPI, cards).";
        links.push({ label: "Start Your Project", url: "/contact?category=" + encodeURIComponent("E-Commerce Website") });
        links.push({ label: "Start With This Website Type", url: "/contact?category=" + encodeURIComponent("E-Commerce Website") });
        links.push({ label: "View TicketX Platform", url: "/work/ticketx" });
      } else if (/online payments?|pay online|upi|payment gateway|accept payments/i.test(q)) {
        answer = "Yes! We integrate secure online payment gateways supporting UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking with instant checkout notifications and receipt generation.";
        links.push({ label: "Start Your Project", url: "/contact?category=" + encodeURIComponent("E-Commerce Website") });
      } else if (/what kind of website|which website|kind of website|what type of website|recommend|need a website|help me decide/.test(q)) {
        answer = "We specialize in five core website categories:\n• Personal Portfolio — Showcase work, skills, and resume.\n• Blog / Content Website — Share articles, stories, and updates.\n• Business Website — Help customers discover and contact your company.\n• Agency Website — Present your agency, team, and client case studies.\n• E-Commerce Website / Online Store — Showcase products, accept online payments, and sell.\nTell us about your project and we'll guide you to the perfect fit!";
        links.push({ label: "Start Your Project", url: "/contact" });
        links.push({ label: "Explore Our Work", url: "/work" });
      } else if (/how do i start|how to start|start a project|how do i get started|begin/.test(q)) {
        answer = "Starting is simple and takes just 3 short steps! On our Contact page, select your website category, choose the features you'd like, and tell us how to reach you. You'll immediately receive your sequential SXD Tracking ID and no payment is required to enquire.";
        links.push({ label: "Start Your Project", url: "/contact" });
        links.push({ label: "Explore Our Work", url: "/work" });
      } else if (/online store|ecommerce|e-commerce|sell products|shopping/.test(q)) {
        answer = "Yes! We design and build modern online stores and e-commerce websites with clear product catalogues, mobile shopping, WhatsApp ordering, and secure payment checkout (UPI, cards, net banking). You can easily manage products and see incoming orders.";
        links.push({ label: "Start Your Project", url: "/contact?category=" + encodeURIComponent("E-Commerce Website") });
        links.push({ label: "View TicketX Platform", url: "/work/ticketx" });
      } else if (/track|tracking|status|check my project|project status|sxd-/.test(q)) {
        answer = "You can track your project anytime on our Track Project page (/track). For security, enter your unique Tracking ID (such as SXD-001) and your registered email address to view real-time milestone progress, status updates, and countdown days remaining.";
        links.push({ label: "Track My Project", url: "/track" });
        links.push({ label: "Start an Enquiry", url: "/contact" });
      } else if (/price|cost|budget|pricing|rate|how much|what does a website cost/.test(q)) {
        answer = "Every website project is tailored to its specific scope, design requirements, and integrations. We don't use fixed packages or assumptions. Share a brief on our Contact page for an honest, tailored estimate based on your scope.";
        links.push({ label: "Start a Project Brief", url: "/contact" });
      } else if (/time|timeline|how long|launch|deadline/.test(q)) {
        answer = "Project timelines depend on requirements and complexity—typically ranging from 2–4 weeks for focused business websites to 6–10 weeks for bespoke web applications. We confirm exact milestones after understanding your scope.";
        links.push({ label: "Share Your Timeline", url: "/contact" });
      } else if (/codexa|agency|affiliation|founder/.test(q)) {
        answer = "Sanjay is a Co-Founder at CodeXa Agency. It is a distinct, separate professional affiliation alongside SANJU X DEV.";
        links.push({ label: "About SANJU X DEV", url: "/about" });
      } else if (/feature|features|whatsapp button|login|admin dashboard|chatbot/.test(q)) {
        answer = "We support all essential modern website features without confusing jargon: WhatsApp direct chat buttons, online payments (UPI, cards), product listings, appointment booking, user login, admin dashboards, and custom AI assistants like spideyy.";
        links.push({ label: "Start a Project Brief", url: "/contact" });
      } else if (serviceMatch) {
        answer = `${serviceMatch.name}: ${serviceMatch.description} Scope includes: ${serviceMatch.items}.`;
        links.push({ label: "Discuss " + serviceMatch.name, url: "/contact?service=" + encodeURIComponent(serviceMatch.name) });
      } else if (/work|portfolio|projects|case stud|past/.test(q)) {
        answer = "We have five verified portfolio case studies: StarX Live, TicketX, StarX Connect, AudioX, and Yuva Shakti. Each includes real desktop/mobile screenshots, architectural summaries, and live links.";
        links.push({ label: "Explore Our Work", url: "/work" });
      } else if (/contact|email|phone|hire|message|touch|reach/.test(q)) {
        answer = `You can start a project conversation through our simple 2-step contact form or email Sanjay directly at ${s.email}.`;
        links.push({ label: "Start a Conversation", url: "/contact" });
      } else {
        const faqMatch = (s.faqs || []).find((f) =>
          f.q
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 3)
            .some((w) => q.includes(w)),
        );
        if (faqMatch) {
          answer = faqMatch.a;
        } else {
          answer =
            "SANJU X DEV creates custom business websites, online stores, UI/UX designs, custom web applications, and interactive experiences. Explore all five case studies in Our Work or start a project brief.";
          links.push({ label: "Explore Our Work", url: "/work" });
          links.push({ label: "Start Your Project", url: "/contact" });
        }
      }

      if (links.length === 0) {
        links = extractChatLinks(rawQ, answer);
      }

      return send(200, { answer, mode: "FAQ guide", links });
    }

    if (path === "/api/admin" || path === "/api/spideyy") {
      if (!client)
        throw fail(503, "Dedicated Supabase backend is not configured.");

      const ip = String(
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
      ).split(",")[0].trim();
      const ipHash = digest(ip);

      // Lockout status check (publicly callable by owner workspace frontend)
      if (req.method === "POST" && body.action === "lockout-status") {
        const codeLockout = await getLockoutStatus(client, "code:owner");
        const passwordLockout = await getLockoutStatus(client, "password:owner");
        const config = await client
          .from("studio_owner_config")
          .select("pin_verifier")
          .eq("owner_id", OWNER_UID)
          .maybeSingle();
        const verifier = env().ADMIN_PIN_VERIFIER || config?.data?.pin_verifier;

        return send(200, {
          codeLockout,
          passwordLockout,
          pinConfigured: !!verifier,
        });
      }

      // PRIMARY LOGIN — SECRET CODE
      if (req.method === "POST" && body.action === "login-code") {
        const ipScope = "code:ip:" + ipHash;

        // Check connection-level lockout (10 failed attempts -> 15 min lock)
        const ipLockout = await getLockoutStatus(client, ipScope);
        if (ipLockout.locked) {
          throw fail(
            429,
            `Too many failed attempts from your connection. Locked out for ${ipLockout.remainingSeconds} seconds.`,
          );
        }

        // Check owner secret code lockout (3 failed attempts -> 3 min lock)
        const ownerLockout = await getLockoutStatus(client, "code:owner");
        if (ownerLockout.locked) {
          throw fail(
            429,
            `Too many unsuccessful attempts. Secret code authentication is locked for ${ownerLockout.remainingSeconds} seconds.`,
          );
        }

        const config = await checked(
          client
            .from("studio_owner_config")
            .select("pin_verifier")
            .eq("owner_id", OWNER_UID)
            .maybeSingle(),
        );
        const verifier = env().ADMIN_PIN_VERIFIER || config?.pin_verifier;

        if (!verifier) {
          throw fail(
            400,
            "Secret code has not been initialized. Please sign in with 'Login with spideyy' first to configure it.",
          );
        }

        const isValid = verifyPin(body.code, verifier);
        if (!isValid) {
          await recordFailedAttempt(client, ipScope, 10, 15);
          const failStatus = await recordFailedAttempt(client, "code:owner", 3, 3);
          if (failStatus.locked) {
            throw fail(
              429,
              "Too many unsuccessful attempts. Secret code authentication is locked for 3 minutes.",
            );
          }
          const remaining = 3 - failStatus.failedAttempts;
          throw fail(
            403,
            `Authentication was not accepted. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before a 3-minute lockout.`,
          );
        }

        // Valid secret code: clear lockouts
        await clearLockout(client, "code:owner");
        await clearLockout(client, ipScope);

        // Issue official Supabase session for owner so RLS is satisfied
        let userSessionId = randomBytes(16).toString("hex");
        let sessionToken = null;
        try {
          if (client.auth?.admin) {
            const { data: userData } = await client.auth.admin.getUserById(OWNER_UID);
            if (userData?.user?.email) {
              const { data: linkData } = await client.auth.admin.generateLink({
                type: "magiclink",
                email: userData.user.email,
              });
              if (linkData?.properties?.hashed_token) {
                const { data: authData } = await client.auth.verifyOtp({
                  token_hash: linkData.properties.hashed_token,
                  type: "magiclink",
                });
                if (authData?.session) {
                  sessionToken = authData.session.access_token;
                  userSessionId = JSON.parse(
                    Buffer.from(sessionToken.split(".")[1], "base64url").toString(),
                  ).session_id || userSessionId;
                }
              }
            }
          }
        } catch {
          /* offline / test mock fallback */
        }

        const token = randomBytes(32).toString("hex");
        await checked(
          client.from("studio_sessions").insert({
            hash: digest(token),
            owner_id: OWNER_UID,
            auth_session: userSessionId,
            expires_at: new Date(Date.now() + 1800000).toISOString(),
          }),
        );

        res.setHeader(
          "Set-Cookie",
          "studio_unlock=" +
            token +
            "; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800" +
            (env().VERCEL ? " ; Secure" : ""),
        );

        await audit(client, "Owner workspace unlocked via secret code");
        return send(200, { ok: true, sessionToken });
      }

      // SECONDARY LOGIN — LOGIN WITH SPIDEYY (Email + Password)
      if (req.method === "POST" && body.action === "login-password") {
        const ipScope = "password:ip:" + ipHash;

        // Check connection lockout (10 attempts -> 15 min lock)
        const ipLockout = await getLockoutStatus(client, ipScope);
        if (ipLockout.locked) {
          throw fail(
            429,
            `Too many failed attempts from your connection. Locked out for ${ipLockout.remainingSeconds} seconds.`,
          );
        }

        // Check credential lockout (3 attempts -> 3 min lock)
        const ownerLockout = await getLockoutStatus(client, "password:owner");
        if (ownerLockout.locked) {
          throw fail(
            429,
            `Too many unsuccessful attempts. Credential authentication is locked for ${ownerLockout.remainingSeconds} seconds.`,
          );
        }

        if (!body.email || !body.password) {
          throw fail(400, "Email and password are required.");
        }

        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: String(body.email).trim(),
          password: String(body.password),
        });

        if (authError || !authData?.user || authData.user.id !== OWNER_UID) {
          await recordFailedAttempt(client, ipScope, 10, 15);
          const failStatus = await recordFailedAttempt(client, "password:owner", 3, 3);
          if (failStatus.locked) {
            throw fail(
              429,
              "Too many unsuccessful attempts. Credential authentication is locked for 3 minutes.",
            );
          }
          const remaining = 3 - failStatus.failedAttempts;
          throw fail(
            403,
            `Authentication was not accepted. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before a 3-minute lockout.`,
          );
        }

        // Valid credentials: clear lockouts
        await clearLockout(client, "password:owner");
        await clearLockout(client, ipScope);

        const config = await checked(
          client
            .from("studio_owner_config")
            .select("pin_verifier")
            .eq("owner_id", OWNER_UID)
            .maybeSingle(),
        );
        const verifier = env().ADMIN_PIN_VERIFIER || config?.pin_verifier;

        const token = randomBytes(32).toString("hex");
        let sessionId = randomBytes(16).toString("hex");
        try {
          sessionId = JSON.parse(
            Buffer.from(authData.session.access_token.split(".")[1], "base64url").toString(),
          ).session_id || sessionId;
        } catch {
          /* use fallback */
        }

        await checked(
          client.from("studio_sessions").insert({
            hash: digest(token),
            owner_id: OWNER_UID,
            auth_session: sessionId,
            expires_at: new Date(Date.now() + 1800000).toISOString(),
          }),
        );

        res.setHeader(
          "Set-Cookie",
          "studio_unlock=" +
            token +
            "; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800" +
            (env().VERCEL ? " ; Secure" : ""),
        );

        await audit(client, "Owner workspace unlocked via credentials");
        return send(200, {
          ok: true,
          session: authData.session,
          pinConfigured: !!verifier,
        });
      }

      // Authenticated actions require either existing owner Supabase Auth JWT or unlock cookie
      const user = await owner(client, req);
      const config = await checked(
        client
          .from("studio_owner_config")
          .select("pin_verifier")
          .eq("owner_id", user.id)
          .maybeSingle(),
      );
      const verifier = env().ADMIN_PIN_VERIFIER || config?.pin_verifier;

      if (req.method === "POST" && body.action === "status")
        return send(200, { pinConfigured: !!verifier });

      // Setup secret code / PIN (requires authenticated owner)
      if (req.method === "POST" && (body.action === "setup-pin" || body.action === "setup-code")) {
        await rate(client, req, "pin:" + user.id, 5);
        if (verifier)
          throw fail(409, "A verification code is already configured.");

        const code = body.code || body.pin;
        const confirm = body.confirmCode || body.confirmPin;
        if (!code || code !== confirm)
          throw fail(400, "The secret codes do not match.");

        const pin_verifier = createPinVerifier(code);
        const result = await client
          .from("studio_owner_config")
          .insert({ owner_id: user.id, pin_verifier });

        if (result.error)
          throw fail(409, "Code setup was not accepted. Sign in again.");

        await clearLockout(client, "code:owner");
        await audit(client, "Owner secret code initialized");
        return send(200, { ok: true });
      }

      // Legacy PIN unlock (for backward compatibility)
      if (req.method === "POST" && body.action === "unlock") {
        await rate(client, req, "pin:" + user.id, 5);
        if (!verifyPin(body.pin, verifier))
          throw fail(403, "Verification code was not accepted.");

        const token = randomBytes(32).toString("hex");
        await checked(
          client.from("studio_sessions").insert({
            hash: digest(token),
            owner_id: user.id,
            auth_session: user.session,
            expires_at: new Date(Date.now() + 1800000).toISOString(),
          }),
        );
        res.setHeader(
          "Set-Cookie",
          "studio_unlock=" +
            token +
            "; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800" +
            (env().VERCEL ? " ; Secure" : ""),
        );
        await audit(client, "Owner workspace unlocked");
        return send(200, { ok: true });
      }

      if (req.method === "POST" && body.action === "logout") {
        await checked(
          client.from("studio_sessions").delete().eq("owner_id", user.id),
        );
        res.setHeader(
          "Set-Cookie",
          "studio_unlock=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return send(200, { ok: true });
      }

      await unlocked(client, req, user);

      // Use the owner's JWT for private operations so database and Storage RLS
      // independently enforce the exact UID and unlocked-session requirement.
      const admin = createClient(
        env().SUPABASE_URL,
        env().SUPABASE_ANON_KEY || env().SUPABASE_SERVICE_ROLE_KEY,
        {
          global: { headers: { Authorization: "Bearer " + user.token } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );

      if (req.method === "GET") {
        let projects = [];
        let emails = [];
        try {
          const pr = await admin.from("studio_projects").select("*").order("created_at", { ascending: false });
          if (pr.data) projects = pr.data;
        } catch {
          projects = [];
        }
        try {
          const er = await admin.from("studio_emails").select("*").order("created_at", { ascending: false }).limit(200);
          if (er.data) emails = er.data;
        } catch {
          emails = [];
        }

        const [content, enquiries, activity, media] = await Promise.all([
          site(admin),
          checked(
            admin
              .from("studio_enquiries")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(500),
          ),
          checked(
            admin
              .from("studio_audit")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50),
          ),
          admin.storage.from("studio-media").list("", { limit: 100 }),
        ]);

        return send(200, {
          site: content,
          enquiries,
          activity,
          media: media.data || [],
          mediaBase:
            env().SUPABASE_URL + "/storage/v1/object/public/studio-media/",
          projects,
          emails,
          aiConfig: {
            provider: "OpenAI",
            configured: Boolean(env().OPENAI_API_KEY && env().OPENAI_API_KEY.trim().length > 5),
            model: env().OPENAI_MODEL || "gpt-4o-mini",
            dailyLimit: Number(content?.aiDailyLimit || 100),
            maxTokens: Number(content?.aiMaxTokens || 450),
            stats: getAiStats(),
          },
          emailConfig: {
            provider: "Gmail SMTP",
            configured: Boolean(env().SMTP_USER && env().SMTP_PASS),
            host: env().SMTP_HOST || "smtp.gmail.com",
            port: Number(env().SMTP_PORT || 465),
            secure: env().SMTP_SECURE !== "false",
            user: env().SMTP_USER || "",
            fromEmail: env().SMTP_FROM_EMAIL || (env().SMTP_USER ? `"SANJU X DEV" <${env().SMTP_USER}>` : '"SANJU X DEV" <sanjuxdev27@gmail.com>'),
            ownerNotificationEmail: env().OWNER_NOTIFICATION_EMAIL || env().SMTP_USER || "sanjuxdev27@gmail.com",
          },
        });
      }

      if (req.method !== "POST") throw fail(405, "Method not allowed.");

      switch (body.action) {
        case "save": {
          const content = validateSite(body.site);
          await checked(
            admin.from("studio_content").upsert({
              id: "site",
              data: content,
              updated_at: new Date().toISOString(),
            }),
          );
          await audit(client, "Website content published");
          break;
        }

        case "enquiry": {
          if (
            !["new", "in-progress", "closed"].includes(body.status) ||
            typeof body.notes !== "string" ||
            body.notes.length > 5000
          )
            throw fail(400, "Invalid enquiry update.");
          await checked(
            admin
              .from("studio_enquiries")
              .update({ status: body.status, notes: body.notes })
              .eq("id", body.id),
          );
          await audit(client, "Enquiry updated");
          break;
        }

        case "enquiry-read": {
          if (typeof body.id !== "string") throw fail(400, "Invalid enquiry id.");
          await checked(
            admin
              .from("studio_enquiries")
              .update({ read: !!body.read })
              .eq("id", body.id),
          );
          break;
        }

        case "mark-all-read": {
          await checked(
            admin
              .from("studio_enquiries")
              .update({ read: true })
              .eq("read", false),
          );
          await audit(client, "All enquiries marked as read");
          break;
        }

        case "delete-enquiry":
          await checked(
            admin.from("studio_enquiries").delete().eq("id", body.id),
          );
          await audit(client, "Enquiry deleted");
          break;

        case "create-project": {
          if (!body.project || typeof body.project !== "object") throw fail(400, "Invalid project data.");
          const p = body.project;
          const trackingCode = p.tracking_code || p.trackingCode;
          if (!trackingCode || !p.title || !p.client_email) throw fail(400, "Tracking ID, title, and client email are required.");

          const projectRecord = {
            tracking_code: trackingCode,
            title: String(p.title).trim(),
            client_name: String(p.client_name || p.clientName || "").trim(),
            client_email: String(p.client_email || p.clientEmail || "").trim(),
            client_phone: p.client_phone || p.clientPhone || null,
            company: p.company || null,
            service: String(p.service || "Digital Development").trim(),
            status: p.status || "scope_confirmed",
            agreed_scope: p.agreed_scope || p.agreedScope || null,
            estimated_price: p.estimated_price || p.estimatedPrice || null,
            agreed_price: p.agreed_price || p.agreedPrice || null,
            start_date: p.start_date || p.startDate || new Date().toISOString().slice(0, 10),
            target_date: p.target_date || p.targetDate || null,
            progress_pct: Number(p.progress_pct ?? p.progressPct ?? 0),
            milestones: Array.isArray(p.milestones) ? p.milestones : [],
            public_update: p.public_update || p.publicUpdate || "Project scope and milestones have been agreed. Commencing work.",
            public_update_time: new Date().toISOString(),
            internal_notes: p.internal_notes || p.internalNotes || null,
            live_url: p.live_url || p.liveUrl || null,
            delivery_notes: p.delivery_notes || p.deliveryNotes || null,
            enquiry_id: p.enquiry_id || p.enquiryId || null,
          };

          const insertRes = await admin.from("studio_projects").insert(projectRecord).select().single();
          if (insertRes.error) throw fail(400, "Unable to create project: " + insertRes.error.message);

          if (projectRecord.enquiry_id) {
            await admin.from("studio_enquiries").update({ status: "in-progress", project_id: insertRes.data.id }).eq("id", projectRecord.enquiry_id);
          }

          if (body.notifyClient) {
            try {
              const html = formatProjectAcceptedHtml(insertRes.data, env().SITE_URL);
              await sendEmail({
                to: insertRes.data.client_email,
                subject: `Project Accepted: ${insertRes.data.title} — ${insertRes.data.tracking_code} | SANJU X DEV`,
                html,
                trackingCode: insertRes.data.tracking_code,
                template: "project_accepted",
                options: getSmtpConfig(env()),
                client: admin,
              });
            } catch {
              /* non-blocking notification failure */
            }
          }

          await audit(client, "Project created: " + projectRecord.title + " (" + trackingCode + ")");
          return send(200, { ok: true, project: insertRes.data });
        }

        case "update-project": {
          if (!body.project || !body.project.id) throw fail(400, "Project ID is required.");
          const p = body.project;
          const updateRecord = {
            title: p.title,
            client_name: p.client_name ?? p.clientName,
            client_email: p.client_email ?? p.clientEmail,
            client_phone: p.client_phone ?? p.clientPhone,
            company: p.company,
            service: p.service,
            status: p.status,
            agreed_scope: p.agreed_scope ?? p.agreedScope,
            estimated_price: p.estimated_price ?? p.estimatedPrice,
            agreed_price: p.agreed_price ?? p.agreedPrice,
            start_date: p.start_date ?? p.startDate,
            target_date: p.target_date ?? p.targetDate,
            completed_date: p.status === "completed" ? (p.completed_date ?? p.completedDate ?? new Date().toISOString().slice(0, 10)) : null,
            progress_pct: Number(p.progress_pct ?? p.progressPct ?? 0),
            milestones: Array.isArray(p.milestones) ? p.milestones : [],
            public_update: p.public_update ?? p.publicUpdate,
            public_update_time: p.public_update ? new Date().toISOString() : undefined,
            internal_notes: p.internal_notes ?? p.internalNotes,
            live_url: p.live_url ?? p.liveUrl,
            delivery_notes: p.delivery_notes ?? p.deliveryNotes,
            updated_at: new Date().toISOString(),
          };

          Object.keys(updateRecord).forEach((k) => updateRecord[k] === undefined && delete updateRecord[k]);

          const updateRes = await admin.from("studio_projects").update(updateRecord).eq("id", p.id).select().single();
          if (updateRes.error) throw fail(400, "Unable to update project: " + updateRes.error.message);

          if (body.notifyClient) {
            try {
              const updated = updateRes.data;
              let html = "";
              let subject = "";
              let template = "";

              if (updated.status === "completed") {
                html = formatProjectCompletedHtml(updated, env().SITE_URL);
                subject = `Project Completed: ${updated.title} — ${updated.tracking_code} | SANJU X DEV 🎉`;
                template = "project_completed";
              } else if (["on_hold", "declined"].includes(updated.status)) {
                html = formatProjectStatusChangeHtml(updated, body.statusReason || "", env().SITE_URL);
                subject = `Project Status Update: ${updated.title} — ${updated.tracking_code} | SANJU X DEV`;
                template = "status_change";
              } else {
                html = formatProgressUpdatedHtml(updated, body.updateMessage || updated.public_update, env().SITE_URL);
                subject = `Project Progress Update: ${updated.title} — ${updated.tracking_code} (${updated.progress_pct}%)`;
                template = "progress_updated";
              }

              await sendEmail({
                to: updated.client_email,
                subject,
                html,
                trackingCode: updated.tracking_code,
                template,
                options: getSmtpConfig(env()),
                client: admin,
              });
            } catch {
              /* non-blocking notification failure */
            }
          }

          await audit(client, "Project updated: " + (updateRes.data.title || p.id));
          return send(200, { ok: true, project: updateRes.data });
        }

        case "delete-project": {
          if (!body.id) throw fail(400, "Project ID is required.");
          await admin.from("studio_projects").delete().eq("id", body.id);
          await audit(client, "Project deleted: " + body.id);
          return send(200, { ok: true });
        }

        case "retry-email": {
          if (!body.id) throw fail(400, "Email record ID is required.");
          const { data: emailRecord } = await admin.from("studio_emails").select("*").eq("id", body.id).single();
          if (!emailRecord) throw fail(404, "Email record not found.");

          const result = await sendEmail({
            to: emailRecord.recipient,
            subject: emailRecord.subject,
            html: emailRecord.html || `<p>${emailRecord.subject}</p>`,
            trackingCode: emailRecord.tracking_code,
            template: emailRecord.template,
            options: getSmtpConfig(env()),
            client: admin,
          });

          if (!result.success) {
            throw fail(502, result.error || "Retry failed to send email via Gmail SMTP.");
          }

          await audit(client, "Email retried successfully via Gmail SMTP: " + emailRecord.recipient);
          return send(200, { ok: true, id: result.id });
        }

        case "test-email": {
          const e = env();
          const testRecipient = body.recipient || e.OWNER_NOTIFICATION_EMAIL || e.SMTP_USER || "sanjuxdev27@gmail.com";
          const timeIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" }) + " IST";
          const host = e.SMTP_HOST || "smtp.gmail.com";
          const port = e.SMTP_PORT || "465";
          const user = e.SMTP_USER || "sanjuxdev27@gmail.com";
          const fromDisplay = e.SMTP_FROM_EMAIL || (e.SMTP_USER ? `"SANJU X DEV" <${e.SMTP_USER}>` : '"SANJU X DEV" <sanjuxdev27@gmail.com>');

          const testHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #222; background: #eee5d5;">
              <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #dcd3c4; border-radius: 8px; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                <div style="font-size: 13px; font-weight: 700; color: #852c32; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">SANJU X DEV · System Test</div>
                <h2 style="color: #201c1b; margin: 0 0 14px 0; font-size: 20px;">Gmail SMTP Test Verification</h2>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #444;">This message verifies that server-side email dispatch via Gmail SMTP is operating properly with SSL/TLS encryption.</p>
                <div style="background: #fdfbf7; border: 1px solid #dcd3c4; border-left: 4px solid #852c32; padding: 14px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 13px; line-height: 1.8;">
                  <div><strong>Delivery Provider:</strong> Gmail SMTP</div>
                  <div><strong>Server & Port:</strong> ${host}:${port} (SSL/TLS)</div>
                  <div><strong>Authenticated Account:</strong> ${user}</div>
                  <div><strong>Sender Address:</strong> ${fromDisplay}</div>
                  <div><strong>Recipient:</strong> ${testRecipient}</div>
                  <div><strong>Dispatched At:</strong> ${timeIST}</div>
                  <div><strong>Status:</strong> Connection Established & Verified</div>
                </div>
                <p style="font-size: 13px; color: #666; margin: 16px 0 0 0;">Customer enquiries, tracking notifications, and project updates will be dispatched through this channel.</p>
              </div>
            </div>
          `;

          const result = await sendEmail({
            to: testRecipient,
            subject: "SANJU X DEV — Gmail SMTP Delivery Verification",
            html: testHtml,
            template: "test_verification",
            options: getSmtpConfig(e),
            client: admin,
          });

          if (!result.success) {
            throw fail(502, result.error || "Gmail SMTP delivery test failed. Verify SMTP_USER and SMTP_PASS.");
          }

          await audit(client, "Gmail SMTP test email dispatched to " + testRecipient);
          return send(200, { ok: true, id: result.id, recipient: testRecipient, provider: "Gmail SMTP" });
        }

        case "test-ai": {
          const openAiKey = (env().OPENAI_API_KEY || "").trim();
          const openAiModel = env().OPENAI_MODEL || "gpt-4o-mini";
          if (!openAiKey || openAiKey.length <= 5) {
            throw fail(400, "OPENAI_API_KEY is not configured in environment variables (.env.local).");
          }

          try {
            const fetchImpl = env().OPENAI_FETCH || globalThis.fetch;
            const r = await fetchImpl("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + openAiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: openAiModel,
                messages: [
                  { role: "system", content: "You are spideyy AI for SANJU X DEV. Respond in one short, energetic sentence confirming that the AI connection is verified and operational." },
                  { role: "user", content: "Test connection." },
                ],
                max_tokens: 100,
                temperature: 0.5,
              }),
              signal: AbortSignal.timeout(15000),
            });

            if (!r.ok) {
              const errData = await r.json().catch(() => ({}));
              const cleanMsg = sanitizeAiError(errData.error?.message || ("OpenAI status " + r.status), openAiKey);
              throw fail(502, cleanMsg);
            }

            const d = await r.json();
            const reply = d.choices?.[0]?.message?.content?.trim() || "AI responded successfully.";
            const stats = getAiStats();
            stats.requestsToday++;
            stats.lastUsed = new Date().toISOString();
            stats.lastModel = openAiModel;
            await audit(client, "OpenAI connection tested successfully (" + openAiModel + ")");
            return send(200, { ok: true, answer: reply, model: openAiModel, provider: "OpenAI" });
          } catch (err) {
            const clean = sanitizeAiError(err.message, openAiKey);
            throw fail(502, clean);
          }
        }

        case "verify-smtp": {
          const status = await verifySmtpConnection(getSmtpConfig(env()));
          return send(200, status);
        }

        case "save-form-options": {
          if (!body.formOptions || typeof body.formOptions !== "object") throw fail(400, "Invalid form options.");
          const currentSite = await site(admin);
          const updatedSite = {
            ...currentSite,
            formOptions: body.formOptions,
          };
          await admin.from("studio_content").upsert({
            id: "site",
            data: updatedSite,
            updated_at: new Date().toISOString(),
          });
          await audit(client, "Form options and services updated");
          return send(200, { ok: true });
        }

        case "upload": {
          if (typeof body.data !== "string" || body.data.length > 4200000)
            throw fail(400, "Image must be smaller than 3 MB.");
          const buffer = Buffer.from(body.data, "base64");
          const png = buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
          const jpg =
            buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
          const webp =
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
          if (!png && !jpg && !webp)
            throw fail(400, "Use a PNG, JPEG or WebP image.");
          const name =
            randomBytes(12).toString("hex") +
            "." +
            (png ? "png" : jpg ? "jpg" : "webp");
          const r = await admin.storage
            .from("studio-media")
            .upload(name, buffer, {
              contentType: png
                ? "image/png"
                : jpg
                  ? "image/jpeg"
                  : "image/webp",
            });
          if (r.error)
            throw fail(503, "Upload failed. Check Storage configuration.");
          await audit(client, "Media uploaded");
          return send(200, {
            url:
              env().SUPABASE_URL +
              "/storage/v1/object/public/studio-media/" +
              name,
          });
        }

        case "delete-media": {
          if (!/^[a-f0-9]{24}\.(png|jpg|webp)$/.test(body.name))
            throw fail(400, "Invalid media name.");
          const r = await admin.storage
            .from("studio-media")
            .remove([body.name]);
          if (r.error) throw fail(503, "Unable to delete media.");
          await audit(client, "Media deleted");
          break;
        }

        default:
          throw fail(400, "Unknown action.");
      }

      return send(200, { ok: true });
    }

    throw fail(404, "Not found.");
  } catch (e) {
    send(e.status || 400, {
      error: e.status
        ? e.message
        : "Invalid request. Please check the supplied information.",
    });
  }
}
