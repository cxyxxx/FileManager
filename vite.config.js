import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const host = process.env.TAURI_DEV_HOST;
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
        port: 1420,
        strictPort: true,
        host: host || false,
        watch: {
            ignored: ["**/src-tauri/**", "**/target/**", "**/.git/**", "**/.vscode/**"],
            usePolling: true,
        },
    },
});
function stripViteClient() {
    return {
        name: "strip-vite-client-for-tauri-webkit",
        enforce: "post",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                console.log("Vite request:", req.url);
                next();
            });
        },
        transformIndexHtml: {
            order: "post",
            handler(html) {
                return html.replace(/\s*<script type="module" src="\/@vite\/client"><\/script>\s*/, "\n");
            },
        },
    };
}
