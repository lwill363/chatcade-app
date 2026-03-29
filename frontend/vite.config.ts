import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api/auth":    { target: "http://localhost:3001", changeOrigin: true },
      "/api/users":   { target: "http://localhost:3002", changeOrigin: true },
      // Messages must come before channels (more specific path)
      "^/api/channels/[^/]+/messages": { target: "http://localhost:3004", changeOrigin: true },
      "/api/channels": { target: "http://localhost:3003", changeOrigin: true },
      "/api/friends":  { target: "http://localhost:3005", changeOrigin: true },
      "/api/games":    { target: "http://localhost:3006", changeOrigin: true },
    },
  },
});
