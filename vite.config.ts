import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST ?? "127.0.0.1";

export default defineConfig({
  plugins: [react(), stripViteClient()],
  clearScreen: false,
  build: {
    target: "es2019",
  },
  esbuild: {
    jsx: "automatic",
    target: "es2019",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2019",
    },
  },
  server: {
    hmr: false,
    port: 1520,
    strictPort: true,
    host: true, // Listen on all addresses for WSL port forwarding
    watch: {
      ignored: ["**/src-tauri/**", "**/target/**", "**/.git/**", "**/.vscode/**"],
      usePolling: true,
    },
  },
});

function stripViteClient() {
  return {
    name: "strip-vite-client-for-tauri-webkit",
    enforce: "post" as const,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log("Vite request:", req.url);
        next();
      });
    },
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        return html.replace(/\s*<script type="module" src="\/@vite\/client"><\/script>\s*/, "\n");
      },
    },
  };
}
