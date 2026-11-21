import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Server bundle for the Provider's own React: everything is inlined so the fragment is
// rendered with the same React copy that is shipped in the browser bundle.
export default defineConfig({
  plugins: [react()],
  ssr: { noExternal: true },
  build: {
    ssr: "src/fragment.server.tsx",
    outDir: "dist/server",
    emptyOutDir: true,
    target: "node22",
    sourcemap: false,
    rollupOptions: {
      output: { entryFileNames: "fragment.server.js", inlineDynamicImports: true },
    },
  },
});
