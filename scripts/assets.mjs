import sharp from "sharp";
import fs from "node:fs/promises";
for (const f of await fs.readdir("public/media"))
  if (f.endsWith(".png") && f !== "favicon.png")
    await sharp("public/media/" + f)
      .resize(f === "official-logo.png" ? 600 : 1440, null, {
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toFile("public/media/" + f.replace(".png", ".webp"));
await sharp("public/media/official-logo.png")
  .resize(64, 64)
  .png()
  .toFile("public/media/favicon.png");
