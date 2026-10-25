import nodemailer from "nodemailer";

const escape = (s) =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function sanitizeError(err, pass) {
  let msg = String(err?.message || err || "Email delivery failed");
  if (pass && typeof pass === "string" && pass.length > 3) {
    msg = msg.split(pass).join("[REDACTED]");
  }
  return msg;
}

function emailShell(title, preheader, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #222; margin: 0; padding: 24px; background: #eee5d5; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #dcd3c4; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #852c32; margin-bottom: 12px; }
    h1 { margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #201c1b; line-height: 1.25; }
    p { margin: 0 0 14px 0; font-size: 14px; color: #392e1d; }
    .code-badge { display: inline-block; background: #eee5d5; color: #852c32; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 17px; font-weight: 700; padding: 6px 14px; border-radius: 6px; border: 1px dashed #852c32; margin: 12px 0 18px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .meta-table td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    .meta-table td.label { font-weight: 600; color: #6c5c4e; width: 140px; }
    .box { background: #fdfbf7; border-left: 4px solid #852c32; padding: 14px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; font-size: 14px; white-space: pre-wrap; color: #2e261f; }
    .btn { display: inline-block; background: #852c32; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 14px; }
    .btn-secondary { display: inline-block; background: #25d366; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-left: 8px; margin-top: 14px; }
    .footer { font-size: 12px; color: #706044; margin-top: 28px; border-top: 1px solid #eee; padding-top: 16px; }
    .notice { font-size: 12px; color: #706044; background: #fdfbf7; padding: 10px 14px; border-radius: 4px; border: 1px solid #e8decb; margin-top: 16px; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#eee5d5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escape(preheader)}</div>
  <div class="card">
    <div class="brand">SANJU X DEV · Digital Solutions</div>
    ${content}
    <div class="footer">
      SANJU X DEV — Design with distinction & powerful digital experiences.<br>
      Direct enquiries: <a href="mailto:sanjuxdev27@gmail.com" style="color: #852c32;">sanjuxdev27@gmail.com</a>
    </div>
  </div>
</body>
</html>`;
}

// EMAIL A: New Enquiry to Owner
export function formatNewEnquiryOwnerHtml(enquiry, trackingCode, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const dashboardUrl = origin + "/spideyy";
  const cleanPhone = (enquiry.phone || "").replace(/[^0-9]/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
  const timeIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

  const content = `
    <h1>New Client Enquiry Received</h1>
    <div class="code-badge">${escape(trackingCode)}</div>
    <p>A new customer has submitted an enquiry through the website.</p>

    <table class="meta-table">
      <tr><td class="label">Client Name</td><td><strong>${escape(enquiry.name)}</strong></td></tr>
      <tr><td class="label">Business / Brand</td><td>${escape(enquiry.company || "Individual / Personal Project")}</td></tr>
      <tr><td class="label">Email</td><td><a href="mailto:${escape(enquiry.email)}" style="color:#852c32;">${escape(enquiry.email)}</a></td></tr>
      <tr><td class="label">Mobile Number</td><td>${escape(enquiry.phone || "Not provided")}</td></tr>
      ${enquiry.whatsapp ? `<tr><td class="label">WhatsApp</td><td>${escape(enquiry.whatsapp)}</td></tr>` : ""}
      <tr><td class="label">Preferred Contact</td><td><strong>${escape(enquiry.preferred_contact || "Email")}</strong></td></tr>
      <tr><td class="label">Primary Service</td><td><strong>${escape(enquiry.service)}</strong></td></tr>
      ${enquiry.categories?.length ? `<tr><td class="label">Project Types</td><td>${escape(enquiry.categories.join(", "))}</td></tr>` : ""}
      ${enquiry.design_preference ? `<tr><td class="label">Design Style</td><td>${escape(enquiry.design_preference)}</td></tr>` : ""}
      ${enquiry.reference_url ? `<tr><td class="label">Reference Link</td><td><a href="${escape(enquiry.reference_url)}" target="_blank">${escape(enquiry.reference_url)}</a></td></tr>` : ""}
      ${enquiry.has_domain ? `<tr><td class="label">Domain Status</td><td>${escape(enquiry.has_domain)}</td></tr>` : ""}
      ${enquiry.has_existing_website ? `<tr><td class="label">Existing Site</td><td>${escape(enquiry.has_existing_website)}</td></tr>` : ""}
      ${enquiry.website_url ? `<tr><td class="label">Existing Website</td><td><a href="${escape(enquiry.website_url)}" target="_blank">${escape(enquiry.website_url)}</a></td></tr>` : ""}
      ${enquiry.city ? `<tr><td class="label">Location</td><td>${escape(enquiry.city)}, ${escape(enquiry.country || "")}</td></tr>` : ""}
      <tr><td class="label">Timeline</td><td>${escape(enquiry.timeline || "Flexible")}</td></tr>
      <tr><td class="label">Budget Preference</td><td>${escape(enquiry.budget || "Not specified")}</td></tr>
      <tr><td class="label">Submitted At</td><td>${escape(timeIST)}</td></tr>
    </table>

    <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555;">Project Requirements</div>
    <div class="box">${escape(enquiry.description)}</div>

    ${enquiry.additional_message ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Additional Message</div>
      <div class="box" style="border-left-color: #315768;">${escape(enquiry.additional_message)}</div>
    ` : ""}

    ${enquiry.features?.length ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Requested Features</div>
      <div class="box" style="border-left-color: #6c5c4e;">${escape(Array.isArray(enquiry.features) ? enquiry.features.join(", ") : enquiry.features)}</div>
    ` : ""}

    <div style="margin-top: 20px;">
      <a href="${dashboardUrl}" class="btn">Open in Dashboard →</a>
      ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn-secondary">Message on WhatsApp</a>` : ""}
    </div>
  `;

  return emailShell("New Enquiry — " + trackingCode, "New project enquiry from " + enquiry.name, content);
}

// EMAIL B: Confirmation to Customer with SXD Tracking Code
export function formatCustomerConfirmationHtml(enquiry, trackingCode, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const trackUrl = `${origin}/track?code=${encodeURIComponent(trackingCode)}`;

  const content = `
    <h1>We’ve received your enquiry</h1>
    <p>Hello ${escape(enquiry.name)},</p>
    <p>Thank you for considering <strong>SANJU X DEV</strong>. We’ve received your project requirements and will review them thoroughly.</p>

    <div style="text-align: center; margin: 20px 0;">
      <div style="font-size: 12px; color: #706044; text-transform: uppercase; letter-spacing: 0.1em;">Your Permanent Tracking ID</div>
      <div class="code-badge">${escape(trackingCode)}</div>
      <div style="font-size: 12px; color: #706044;">Keep this code to check your project status at any time.</div>
    </div>

    <table class="meta-table">
      <tr><td class="label">Project / Business</td><td>${escape(enquiry.company || enquiry.name)}</td></tr>
      <tr><td class="label">Website Type</td><td>${escape(enquiry.service)}</td></tr>
      ${enquiry.design_preference ? `<tr><td class="label">Design Style</td><td>${escape(enquiry.design_preference)}</td></tr>` : ""}
      <tr><td class="label">Timeline</td><td>${escape(enquiry.timeline || "Flexible")}</td></tr>
      <tr><td class="label">Budget Choice</td><td>${escape(enquiry.budget || "Not specified")}</td></tr>
    </table>

    <div class="notice">
      <strong>Important:</strong> Submitting an enquiry allows us to review your requirements. We will contact you via your preferred method (${escape(enquiry.preferred_contact || "Email")}) to confirm scope, timelines, and tailored pricing before work begins.
    </div>

    <div style="margin-top: 22px; text-align: center;">
      <a href="${trackUrl}" class="btn">Track Your Project Status →</a>
    </div>
  `;

  return emailShell("Your Enquiry Has Been Received — " + trackingCode, "Tracking ID: " + trackingCode, content);
}

// EMAIL C: Project Accepted
export function formatProjectAcceptedHtml(project, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const trackUrl = `${origin}/track?code=${encodeURIComponent(project.tracking_code)}`;

  const content = `
    <h1>Project Accepted!</h1>
    <p>Hello ${escape(project.client_name)},</p>
    <p>We are excited to let you know that your project <strong>${escape(project.title)}</strong> has been officially accepted by SANJU X DEV.</p>

    <div class="code-badge">${escape(project.tracking_code)}</div>

    <table class="meta-table">
      <tr><td class="label">Project Title</td><td><strong>${escape(project.title)}</strong></td></tr>
      <tr><td class="label">Service</td><td>${escape(project.service)}</td></tr>
      ${project.target_date ? `<tr><td class="label">Target Completion</td><td><strong>${escape(new Date(project.target_date).toLocaleDateString("en-IN", { dateStyle: "long" }))}</strong></td></tr>` : ""}
      ${project.agreed_price ? `<tr><td class="label">Agreed Price</td><td>${escape(project.agreed_price)}</td></tr>` : ""}
    </table>

    ${project.agreed_scope ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Confirmed Project Scope</div>
      <div class="box">${escape(project.agreed_scope)}</div>
    ` : ""}

    <p style="margin-top: 14px;">You can monitor the live milestones, progress updates, and completion countdown on your project tracking page.</p>

    <div style="margin-top: 20px;">
      <a href="${trackUrl}" class="btn">View Live Project Status →</a>
    </div>
  `;

  return emailShell("Project Accepted: " + project.title + " — " + project.tracking_code, "Your project has been accepted", content);
}

// EMAIL D: Progress Update
export function formatProgressUpdatedHtml(project, updateMessage, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const trackUrl = `${origin}/track?code=${encodeURIComponent(project.tracking_code)}`;

  const content = `
    <h1>Project Progress Update</h1>
    <p>Hello ${escape(project.client_name)},</p>
    <p>A new progress milestone has been published for your project <strong>${escape(project.title)}</strong>.</p>

    <div class="code-badge">${escape(project.tracking_code)}</div>

    <table class="meta-table">
      <tr><td class="label">Current Status</td><td><strong>${escape(project.status_label || project.status)}</strong></td></tr>
      <tr><td class="label">Progress</td><td><strong>${escape(project.progress_pct || 0)}% Completed</strong></td></tr>
      ${project.target_date ? `<tr><td class="label">Target Date</td><td>${escape(new Date(project.target_date).toLocaleDateString("en-IN", { dateStyle: "long" }))}</td></tr>` : ""}
    </table>

    ${updateMessage ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Latest Update</div>
      <div class="box">${escape(updateMessage)}</div>
    ` : ""}

    <div style="margin-top: 20px;">
      <a href="${trackUrl}" class="btn">Check Updated Progress →</a>
    </div>
  `;

  return emailShell("Project Update: " + project.tracking_code, "New update on your project", content);
}

// EMAIL E: Project Completed
export function formatProjectCompletedHtml(project, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const trackUrl = `${origin}/track?code=${encodeURIComponent(project.tracking_code)}`;

  const content = `
    <h1>Your Project is Completed! 🎉</h1>
    <p>Hello ${escape(project.client_name)},</p>
    <p>We are delighted to confirm that development for <strong>${escape(project.title)}</strong> is complete and ready for launch.</p>

    <div class="code-badge">${escape(project.tracking_code)}</div>

    ${project.live_url ? `
      <div style="margin: 20px 0; padding: 16px; background: #fdfbf7; border: 1px solid #dcd3c4; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #706044; margin-bottom: 6px;">Live Website / Application Link</div>
        <a href="${escape(project.live_url)}" target="_blank" style="font-size: 17px; font-weight: 700; color: #852c32; text-decoration: underline;">
          ${escape(project.live_url)} ↗
        </a>
      </div>
    ` : ""}

    ${project.delivery_notes ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Delivery & Handover Notes</div>
      <div class="box">${escape(project.delivery_notes)}</div>
    ` : ""}

    <p style="margin-top: 16px;">Thank you for partnering with SANJU X DEV. Please review your deliverable and let us know if you need any follow-up adjustments or support.</p>

    <div style="margin-top: 20px;">
      <a href="${trackUrl}" class="btn">View Final Project Summary →</a>
    </div>
  `;

  return emailShell("Project Completed: " + project.tracking_code, "Your project is ready", content);
}

// EMAIL F: Project On Hold / Declined
export function formatProjectStatusChangeHtml(project, reason, siteUrl) {
  const origin = (siteUrl || "https://sanju-x-dev.vercel.app").replace(/\/$/, "");
  const trackUrl = `${origin}/track?code=${encodeURIComponent(project.tracking_code)}`;

  const content = `
    <h1>Project Status Notification</h1>
    <p>Hello ${escape(project.client_name)},</p>
    <p>We are writing to update you on the status of your enquiry / project <strong>${escape(project.title || project.tracking_code)}</strong>.</p>

    <div class="code-badge">${escape(project.tracking_code)}</div>

    <table class="meta-table">
      <tr><td class="label">New Status</td><td><strong>${escape(project.status_label || project.status)}</strong></td></tr>
    </table>

    ${reason ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 14px;">Status Explanation</div>
      <div class="box">${escape(reason)}</div>
    ` : ""}

    <p style="margin-top: 16px;">If you have any questions or would like to discuss next steps, please reply to this email or reach us at <a href="mailto:sanjuxdev27@gmail.com" style="color: #852c32;">sanjuxdev27@gmail.com</a>.</p>

    <div style="margin-top: 20px;">
      <a href="${trackUrl}" class="btn">View Project Tracking →</a>
    </div>
  `;

  return emailShell("Project Status: " + project.tracking_code, "Update regarding your project status", content);
}

// Factory helper to construct or extract a Nodemailer transporter
export function createSmtpTransport(options = {}) {
  if (options.transporter) return options.transporter;

  const host = options.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(options.smtpPort || process.env.SMTP_PORT || 465);
  const secure =
    options.smtpSecure !== undefined
      ? Boolean(options.smtpSecure)
      : process.env.SMTP_SECURE === "false"
        ? false
        : true;
  const user = (options.smtpUser || process.env.SMTP_USER || "").trim();
  const pass = (options.smtpPass || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

// Verification helper for diagnostic scripts and dashboard test
export async function verifySmtpConnection(options = {}) {
  const host = options.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(options.smtpPort || process.env.SMTP_PORT || 465);
  const secure =
    options.smtpSecure !== undefined
      ? Boolean(options.smtpSecure)
      : process.env.SMTP_SECURE === "false"
        ? false
        : true;
  const user = (options.smtpUser || process.env.SMTP_USER || "").trim();
  const pass = (options.smtpPass || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    return {
      configured: false,
      verified: false,
      host,
      port,
      secure,
      user: user || null,
      error: "Gmail SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in environment variables.",
    };
  }

  try {
    const transporter =
      options.transporter ||
      nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });

    await transporter.verify();
    return {
      configured: true,
      verified: true,
      host,
      port,
      secure,
      user,
    };
  } catch (err) {
    const cleanErr = sanitizeError(err, pass);
    return {
      configured: true,
      verified: false,
      host,
      port,
      secure,
      user,
      error: cleanErr,
    };
  }
}

// Core Email Dispatcher via Gmail SMTP (with fallback for Resend if legacy configured)
export async function sendEmail({
  to,
  subject,
  html,
  trackingCode = "",
  template = "generic",
  options = {},
  client = null,
}) {
  const user = (options.smtpUser || process.env.SMTP_USER || "").trim();
  const pass = (options.smtpPass || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const fromEmail =
    options.fromEmail ||
    process.env.SMTP_FROM_EMAIL ||
    (user ? `"SANJU X DEV" <${user}>` : '"SANJU X DEV" <sanjuxdev27@gmail.com>');

  // Priority 1: Gmail SMTP Transporter
  const transporter = options.transporter || createSmtpTransport(options);

  if (transporter) {
    try {
      const recipientString = Array.isArray(to) ? to.join(", ") : to;
      const textFallback = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const info = await transporter.sendMail({
        from: fromEmail,
        to: recipientString,
        subject,
        html,
        text: textFallback,
      });

      const messageId = info.messageId || info.response || "gmail-smtp";

      if (client) {
        await logOutbox(client, {
          tracking_code: trackingCode,
          template,
          recipient: recipientString,
          subject,
          status: "sent",
          provider_id: messageId,
        });
      }

      return { success: true, id: messageId, provider: "Gmail SMTP" };
    } catch (err) {
      const cleanErr = sanitizeError(err, pass);
      const recipientString = Array.isArray(to) ? to.join(", ") : to;

      if (client) {
        await logOutbox(client, {
          tracking_code: trackingCode,
          template,
          recipient: recipientString,
          subject,
          status: "failed",
          error: cleanErr,
        });
      }
      return { success: false, error: cleanErr, provider: "Gmail SMTP" };
    }
  }

  // Priority 2: Fallback to Resend (if legacy RESEND_API_KEY is explicitly supplied in options/env)
  const resendApiKey = options.resendApiKey || process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const fetchImpl = options.fetchFn || globalThis.fetch;
    const resendFrom = options.fromEmail || process.env.RESEND_FROM_EMAIL || fromEmail;
    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + resendApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
        signal: AbortSignal.timeout(12000),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.message || "Failed to send email via Resend";
        if (client) {
          await logOutbox(client, {
            tracking_code: trackingCode,
            template,
            recipient: Array.isArray(to) ? to.join(", ") : to,
            subject,
            status: "failed",
            error: errorMsg,
          });
        }
        return { success: false, error: errorMsg, provider: "Resend" };
      }

      if (client) {
        await logOutbox(client, {
          tracking_code: trackingCode,
          template,
          recipient: Array.isArray(to) ? to.join(", ") : to,
          subject,
          status: "sent",
          provider_id: data.id,
        });
      }
      return { success: true, id: data.id, provider: "Resend" };
    } catch (err) {
      const errText = err.message || "Network error while connecting to Resend";
      if (client) {
        await logOutbox(client, {
          tracking_code: trackingCode,
          template,
          recipient: Array.isArray(to) ? to.join(", ") : to,
          subject,
          status: "failed",
          error: errText,
        });
      }
      return { success: false, error: errText, provider: "Resend" };
    }
  }

  // Priority 3: Neither SMTP nor Resend configured -> graceful skip without breaking enquiry
  const unconfiguredReason =
    "Gmail SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in environment variables.";

  if (client) {
    await logOutbox(client, {
      tracking_code: trackingCode,
      template,
      recipient: Array.isArray(to) ? to.join(", ") : to,
      subject,
      status: "failed",
      error: unconfiguredReason,
    });
  }

  return {
    success: false,
    skipped: true,
    reason: unconfiguredReason,
  };
}

// Outbox Logger Helper (persists to studio_emails table)
async function logOutbox(client, record) {
  try {
    if (client?.from) {
      await client.from("studio_emails").insert({
        ...record,
        sent_at: record.status === "sent" ? new Date().toISOString() : null,
      });
    }
  } catch {
    /* non-blocking outbox logging */
  }
}

// Backward-compatible wrapper for initial enquiry notification
export function formatEnquiryHtml(enquiry, siteUrl) {
  return formatNewEnquiryOwnerHtml(enquiry, enquiry.tracking_code || "SXD-001", siteUrl);
}

// Automatic Notification Pipeline: Owner Alert + Customer Tracking Confirmation
export async function sendEnquiryNotification(enquiry, options = {}, client = null) {
  const siteUrl = options.siteUrl || process.env.SITE_URL || "https://sanju-x-dev.vercel.app";
  const trackingCode = enquiry.tracking_code || "SXD-001";
  const toEmail =
    options.toEmail ||
    process.env.OWNER_NOTIFICATION_EMAIL ||
    options.smtpUser ||
    process.env.SMTP_USER ||
    "sanjuxdev27@gmail.com";

  // 1. Send Immediate Notification to Owner's Gmail Inbox
  const ownerHtml = formatNewEnquiryOwnerHtml(enquiry, trackingCode, siteUrl);
  const ownerSubject = `New SANJU X DEV Enquiry — ${trackingCode} (${enquiry.name})`;
  const ownerResult = await sendEmail({
    to: toEmail,
    subject: ownerSubject,
    html: ownerHtml,
    trackingCode,
    template: "new_enquiry_owner",
    options,
    client,
  });

  // 2. Send SXD Tracking Code Confirmation to Customer
  if (enquiry.email && /^\S+@\S+\.\S+$/.test(enquiry.email)) {
    const customerHtml = formatCustomerConfirmationHtml(enquiry, trackingCode, siteUrl);
    const customerSubject = `Your Enquiry Has Been Received — ${trackingCode} | SANJU X DEV`;
    await sendEmail({
      to: enquiry.email,
      subject: customerSubject,
      html: customerHtml,
      trackingCode,
      template: "confirmation_customer",
      options,
      client,
    });
  }

  return ownerResult;
}
