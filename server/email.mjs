export function formatEnquiryHtml(enquiry, siteUrl) {
  const escape = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const dashboardUrl = (siteUrl ? siteUrl.replace(/\/$/, "") : "https://sanju-x-dev.vercel.app") + "/spideyy";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Enquiry — SANJU X DEV</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #222; margin: 0; padding: 24px; background: #f5f4f0; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2ded8; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #852c32; margin-bottom: 8px; }
    h1 { margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .meta-table td.label { font-weight: 600; color: #666; width: 140px; }
    .description-box { background: #faf9f6; border-left: 4px solid #852c32; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0; font-size: 14px; white-space: pre-wrap; }
    .btn { display: inline-block; background: #852c32; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 12px; }
    .footer { font-size: 12px; color: #888; margin-top: 28px; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">SANJU X DEV · New Client Enquiry</div>
    <h1>${escape(enquiry.name)} has submitted an enquiry</h1>
    
    <table class="meta-table">
      <tr>
        <td class="label">Client Name</td>
        <td><strong>${escape(enquiry.name)}</strong></td>
      </tr>
      <tr>
        <td class="label">Email</td>
        <td><a href="mailto:${escape(enquiry.email)}" style="color:#852c32;">${escape(enquiry.email)}</a></td>
      </tr>
      ${enquiry.company ? `<tr><td class="label">Company</td><td>${escape(enquiry.company)}</td></tr>` : ""}
      <tr>
        <td class="label">Requested Service</td>
        <td><strong>${escape(enquiry.service)}</strong></td>
      </tr>
      <tr>
        <td class="label">Timeline</td>
        <td>${escape(enquiry.timeline || "Flexible")}</td>
      </tr>
      ${enquiry.budget ? `<tr><td class="label">Budget</td><td>${escape(enquiry.budget)}</td></tr>` : ""}
    </table>

    <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555;">Project Description</div>
    <div class="description-box">${escape(enquiry.description)}</div>

    ${enquiry.features ? `
      <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 16px;">Requested Features</div>
      <div class="description-box" style="border-left-color: #6c5c4e;">${escape(enquiry.features)}</div>
    ` : ""}

    <div style="margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">Open Owner Workspace →</a>
    </div>

    <div class="footer">
      This notification was generated automatically by your SANJU X DEV backend.<br>
      Direct link: <a href="${dashboardUrl}" style="color: #666;">${dashboardUrl}</a>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEnquiryNotification(enquiry, options = {}) {
  const apiKey = options.resendApiKey || process.env.RESEND_API_KEY;
  const toEmail = options.toEmail || process.env.OWNER_NOTIFICATION_EMAIL || "sanjuxdev27@gmail.com";
  const fromEmail = options.fromEmail || process.env.RESEND_FROM_EMAIL || "SANJU X DEV <onboarding@resend.dev>";
  const siteUrl = options.siteUrl || process.env.SITE_URL || "https://sanju-x-dev.vercel.app";
  const fetchImpl = options.fetchFn || globalThis.fetch;

  if (!apiKey) {
    return {
      success: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured in environment variables",
    };
  }

  const html = formatEnquiryHtml(enquiry, siteUrl);
  const subject = `New Project Enquiry: ${enquiry.name} (${enquiry.service}) — SANJU X DEV`;

  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to send email via Resend",
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Network error while connecting to Resend",
    };
  }
}
