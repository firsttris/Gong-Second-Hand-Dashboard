import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { redact } from "@tanstack/redact/vite";

export default defineConfig({
  // redact() redirects the "react"/"react-dom" imports to TanStack Redact, a smaller
  // React 19 compatible runtime; the code keeps importing from "react".
  plugins: [react(), redact(), tailwindcss()],
  base: "./",
});
