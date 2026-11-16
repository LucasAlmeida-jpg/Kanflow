import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backend = process.env.BACKEND_URL ?? "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: backend, rewrite: (path) => path.replace(/^\/api/, "") },
      "/socket.io": { target: backend, ws: true },
    },
  },
});
