import { randomBytes, scryptSync } from "node:crypto";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const pin = input.trim();
if (!/^\d{4,12}$/.test(pin)) throw Error("Use 4–12 digits.");
const salt = randomBytes(24).toString("hex");
process.stdout.write(
  salt + ":" + scryptSync(pin, salt, 64).toString("hex") + "\n",
);
