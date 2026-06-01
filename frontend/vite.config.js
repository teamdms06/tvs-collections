import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

const appVersion = new Date().toISOString();

// https://vite.dev/config/
export default defineConfig({
  base: "/tvs/",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    rollupOptions: {
      plugins: [
        {
          name: "write-app-version",
          generateBundle() {
            this.emitFile({
              type: "asset",
              fileName: "version.json",
              source: JSON.stringify({ version: appVersion }, null, 2),
            });
          },
        },
      ],
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,

    allowedHosts: ["app.workspace.local"],

    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
