import ts from "typescript";
import fs from "node:fs/promises";
const source = await fs.readFile("src/content.ts", "utf8");
const js = ts.transpile(source, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
});
const { defaults } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
await fs.writeFile("server/seed.json", JSON.stringify(defaults, null, 2));
