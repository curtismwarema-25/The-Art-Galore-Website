import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), "");
  const proxyTarget = viteEnv.VITE_BACKEND_PROXY_TARGET || "http://localhost:4000";
  const allowedHosts = (viteEnv.VITE_ALLOWED_HOSTS || "localhost,127.0.0.1,::1,.loca.lt,.localtunnel.me,.ngrok-free.app,.trycloudflare.com")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    assetsInclude: ["**/*.heic"],
    server: {
      host: "::",
      port: 8080,
      allowedHosts,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
