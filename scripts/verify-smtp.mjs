#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import nodemailer from "nodemailer";

// Read and parse .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const fileEnv = loadEnvLocal();
const env = (k, fallback = "") => process.env[k] || fileEnv[k] || fallback;

const host = env("SMTP_HOST", "smtp.gmail.com");
const port = Number(env("SMTP_PORT", "465"));
const secure = env("SMTP_SECURE", "true") !== "false";
const user = env("SMTP_USER", "").trim();
const pass = env("SMTP_PASS", "").replace(/\s+/g, "");
const fromEmail = env("SMTP_FROM_EMAIL", user ? `"SANJU X DEV" <${user}>` : '"SANJU X DEV" <sanjuxdev27@gmail.com>');
const ownerNotificationEmail = env("OWNER_NOTIFICATION_EMAIL", user || "sanjuxdev27@gmail.com");

console.log("\n=======================================================");
console.log("  SANJU X DEV — GMAIL SMTP DELIVERY DIAGNOSTIC TOOL");
console.log("=======================================================\n");

console.log("Target Server Configuration:");
console.log("  • SMTP_HOST:              " + host);
console.log("  • SMTP_PORT:              " + port);
console.log("  • SMTP_SECURE (SSL/TLS):  " + (secure ? "true (SSL/TLS direct)" : "false"));
console.log("  • SMTP_USER:              " + (user ? user : "[NOT CONFIGURED]"));
console.log("  • SMTP_PASS:              " + (pass ? "[CONFIGURED (16-character Google App Password)]" : "[EMPTY / NOT SET]"));
console.log("  • SMTP_FROM_EMAIL:        " + fromEmail);
console.log("  • OWNER_NOTIF_EMAIL:      " + ownerNotificationEmail);
console.log("");

if (!user || !pass) {
  console.log("⚠️  GMAIL SMTP STATUS: NOT YET CONFIGURED");
  console.log("");
  console.log("To configure your 16-character Google App Password:");
  console.log("  1. Go to your Google Account: https://myaccount.google.com/security");
  console.log("  2. Verify that '2-Step Verification' is turned ON.");
  console.log("  3. Navigate to 'App passwords': https://myaccount.google.com/apppasswords");
  console.log("  4. Generate a new password under the name 'SANJU X DEV Website'.");
  console.log("  5. Copy the 16-character password into your .env.local file:");
  console.log("     SMTP_USER=" + (user || "your-gmail-account@gmail.com"));
  console.log("     SMTP_PASS=xxxx xxxx xxxx xxxx");
  console.log("");
  console.log("Then re-run this script: npm run verify:smtp");
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

console.log("Testing TLS handshake and SMTP authentication with " + host + ":" + port + "...");

try {
  await transporter.verify();
  console.log("✅ SMTP Handshake Successful! Credentials and TLS encryption verified.\n");

  const sendArg = process.argv.find((a) => a.startsWith("--send"));
  if (sendArg) {
    let testRecipient = ownerNotificationEmail;
    if (sendArg.includes("=")) {
      testRecipient = sendArg.split("=")[1].trim();
    }
    console.log("Sending live verification email to: " + testRecipient + "...");
    const timeIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" }) + " IST";

    const info = await transporter.sendMail({
      from: fromEmail,
      to: testRecipient,
      subject: "SANJU X DEV — Live Gmail SMTP Delivery Test Verification",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #222; background: #eee5d5;">
          <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #dcd3c4; border-radius: 8px; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
            <div style="font-size: 13px; font-weight: 700; color: #852c32; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">SANJU X DEV · Live Verification</div>
            <h2 style="color: #201c1b; margin: 0 0 14px 0; font-size: 20px;">Gmail SMTP Connected Successfully 🎉</h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #444;">This email confirms that your SANJU X DEV portfolio website is actively connected to Gmail SMTP.</p>
            <div style="background: #fdfbf7; border: 1px solid #dcd3c4; border-left: 4px solid #852c32; padding: 14px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 13px; line-height: 1.8;">
              <div><strong>Host & Port:</strong> ${host}:${port} (SSL/TLS direct)</div>
              <div><strong>Authenticated Account:</strong> ${user}</div>
              <div><strong>Sender:</strong> ${fromEmail}</div>
              <div><strong>Recipient:</strong> ${testRecipient}</div>
              <div><strong>Timestamp:</strong> ${timeIST}</div>
            </div>
            <p style="font-size: 13px; color: #555;">All incoming client enquiries, tracking IDs, and project milestone updates will be delivered safely through this channel.</p>
          </div>
        </div>
      `,
      text: "SANJU X DEV Live Gmail SMTP Delivery Test Verification. Delivered at " + timeIST,
    });

    console.log("🎉 Test email delivered successfully!");
    console.log("   Message ID: " + (info.messageId || "gmail-smtp-ok"));
    console.log("   Check your inbox at " + testRecipient + "\n");
  } else {
    console.log("Tip: Run with '--send' flag to dispatch a live test email:");
    console.log("     npm run verify:smtp -- --send\n");
  }
} catch (err) {
  let msg = err.message || String(err);
  if (pass) msg = msg.split(pass).join("[REDACTED]");
  console.error("❌ SMTP Verification Failed:");
  console.error("   " + msg);
  console.log("\nCommon Troubleshooting Steps for Gmail SMTP:");
  console.log("  • Ensure '2-Step Verification' is turned ON in your Google Account.");
  console.log("  • Ensure you are using a 16-character Google 'App Password', NOT your primary Google Account password.");
  console.log("  • Verify there are no typos in SMTP_USER (must match your Google email).");
  console.log("  • Verify your network allows outbound connections to smtp.gmail.com on port 465 (TLS/SSL).\n");
  process.exit(1);
}
