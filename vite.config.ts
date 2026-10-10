import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: false
  },
  preview: {
    host: "127.0.0.1",
    port: 4176,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input: "app.html"
    }
  }
});
