import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "studio-api",
      configureServer(server) {
        Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
        server.middlewares.use("/api", async (req, res) => {
          req.url = "/api" + req.url;
          try {
            const { default: handler } = await import("./server/handler.mjs");
            await handler(req, res);
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "API unavailable" }));
          }
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { react: ["react", "react-dom", "react-router-dom"] },
      },
    },
  },
}));
