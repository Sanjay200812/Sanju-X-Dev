#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

const apiKey = (env("OPENAI_API_KEY", "")).trim();
const model = env("OPENAI_MODEL", "gpt-4o-mini").trim();

console.log("\n=======================================================");
console.log("  SANJU X DEV — SPIDEYY AI DIAGNOSTIC & TEST TOOL");
console.log("=======================================================\n");

console.log("Target AI Configuration:");
console.log("  • PROVIDER:          OpenAI (https://api.openai.com/v1/chat/completions)");
console.log("  • MODEL:             " + model);
console.log("  • OPENAI_API_KEY:    " + (apiKey ? "[CONFIGURED (Length: " + apiKey.length + ")]" : "[EMPTY / UNCONFIGURED]"));
console.log("");

if (!apiKey || apiKey.length < 5) {
  console.log("⚠️  AI STATUS: UNCONFIGURED IN .env.local");
  console.log("    spideyy is currently operating safely in 'FAQ guide' mode.");
  console.log("");
  console.log("To connect real OpenAI conversational intelligence:");
  console.log("  1. Sign in to your OpenAI platform account: https://platform.openai.com/api-keys");
  console.log("  2. Create a secret API key (e.g. sk-proj-...).");
  console.log("  3. Add the key into your .env.local file:");
  console.log("     OPENAI_API_KEY=sk-proj-your-key-here");
  console.log("     OPENAI_MODEL=gpt-4o-mini");
  console.log("");
  console.log("Then re-run this tool: npm run verify:ai\n");
  process.exit(0);
}

console.log("Testing connection with OpenAI Chat Completions API...");

const promptsToTest = process.argv.includes("--all")
  ? [
      "Hi spideyy",
      "I want a website for my clothing shop.",
      "Can customers pay online?",
      "How much will it cost?",
      "Naku business website kavali.",
      "How do I track SXD-001?",
      "Can you show your previous projects?",
      "What did I just ask you?",
    ]
  : ["Hi spideyy, please confirm in one sentence that you are online for SANJU X DEV."];

try {
  let history = [];
  for (let i = 0; i < promptsToTest.length; i++) {
    const prompt = promptsToTest[i];
    console.log(`\n[${i + 1}/${promptsToTest.length}] Prompt: "${prompt}"`);

    const systemPrompt =
      "You are spideyy, the intelligent AI website assistant for SANJU X DEV (web design and development studio led by Sanjay). " +
      "Owner/Developer: Sanjay. Professional affiliation: Co-Founder at CodeXa Agency. " +
      "Explain services naturally. Understand Telugu-English phrasing. Recommend from 5 categories: " +
      "Personal Portfolio, Blog / Content Website, Business Website, Agency Website, E-Commerce Website. " +
      "Portfolio case studies: StarX Live, TicketX, StarX Connect, AudioX, Yuva Shakti. " +
      "Track codes: clients track at /track with tracking code and email. Never invent prices or delivery guarantees.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: prompt },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 250,
        temperature: 0.65,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      let msg = errJson.error?.message || `OpenAI API returned status ${response.status}`;
      if (apiKey) msg = msg.split(apiKey).join("[REDACTED]");
      throw new Error(msg);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    console.log(`🤖 spideyy: ${reply}`);

    history.push({ role: "user", content: prompt });
    history.push({ role: "assistant", content: reply });
  }

  console.log("\n🎉 SUCCESS: Genuine OpenAI API responses verified!");
  console.log("   Mode: AI assistant");
  console.log("   Model: " + model + "\n");
} catch (err) {
  let errText = err.message || String(err);
  if (apiKey) errText = errText.split(apiKey).join("[REDACTED]");
  console.error("\n❌ OpenAI API Call Failed:");
  console.error("   " + errText);
  console.log("\nTroubleshooting Steps:");
  console.log("  • Verify OPENAI_API_KEY is active and has billing/credits on OpenAI.");
  console.log("  • Verify OPENAI_MODEL (default: gpt-4o-mini) is accessible.");
  console.log("  • Note: When OpenAI is unconfigured or unavailable, spideyy automatically falls back to verified FAQ guide mode.\n");
  process.exit(1);
}
