import { defineConfig, loadEnv, type Plugin } from "vite";
import { createFragmentBff, providersFromEnv } from "./server/fragment-bff.mjs";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Source maps are only generated and uploaded when SENTRY_AUTH_TOKEN is set (CI / production builds).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryPlugins = sentryAuthToken
  ? [
      sentryVitePlugin({
        org: "fidelis",
        project: "mfe-host",
        authToken: sentryAuthToken,
        release: { name: process.env.VITE_SENTRY_RELEASE },
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
      }),
    ]
  : [];

// Serves /api/fragments in `vite` and `vite preview`; Vercel runs api/fragments/[name].ts instead.
function fragmentBff(mode: string): Plugin {
  const bff = () =>
    createFragmentBff({ providers: providersFromEnv(loadEnv(mode, process.cwd(), "VITE_MFE_")) });
  return {
    name: "fragment-bff",
    configureServer: (server) => void server.middlewares.use(bff()),
    configurePreviewServer: (server) => void server.middlewares.use(bff()),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), fragmentBff(mode), ...sentryPlugins],
  build: {
    target: "esnext",
    cssCodeSplit: false,
    sourcemap: sentryAuthToken ? "hidden" : false,
  },
}));
