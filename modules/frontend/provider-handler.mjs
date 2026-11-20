import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const BASE_PATH = "/api/fragments";

/** Returns the parsed origins, or a message explaining why the value is invalid. */
export function parseHostOrigins(value) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) {
    return "MFE_HOST_ORIGINS must contain the Host origin(s) allowed to load this fragment.";
  }
  const invalid = origins.find((origin) => {
    try {
      return new URL(origin).origin !== origin;
    } catch {
      return true;
    }
  });
  if (invalid) {
    return `MFE_HOST_ORIGINS must contain exact origins without paths or trailing slashes: ${invalid}`;
  }
  return origins;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function failWith(appName, message) {
  console.error(`[${appName}] ${message} (cwd: ${process.cwd()})`);
  return async (_req, res) => sendJson(res, 500, { error: message });
}

/**
 * Provider request handler shared by the Vercel Function and the local servers.
 *
 * - `GET <basePath>/<fragmentName>` streams the server-rendered fragment.
 * - `GET <basePath>/assets/<fragmentName>.client.js` serves the browser bundle with CORS
 *   limited to the Host origins; its SRI hash is sent with the fragment headers.
 *
 * `distRoots` are candidate `dist` directories containing `modules/<name>.js` (browser
 * bundle) and `server/fragment.server.js` (server bundle).
 */
export function createProviderHandler({
  appName,
  fragmentName,
  distRoots,
  hostOrigins,
  basePath = BASE_PATH,
}) {
  const origins = parseHostOrigins(hostOrigins);
  if (typeof origins === "string") return failWith(appName, origins);

  const dist = distRoots.find(
    (root) =>
      existsSync(path.join(root, "modules", `${fragmentName}.js`)) &&
      existsSync(path.join(root, "server", "fragment.server.js")),
  );
  if (!dist) {
    return failWith(
      appName,
      `Built fragment not found for ${appName}; run build:module before deploying.`,
    );
  }

  const scriptPath = `${basePath}/assets/${fragmentName}.client.js`;
  const script = readFileSync(path.join(dist, "modules", `${fragmentName}.js`));
  const integrity = `sha384-${createHash("sha384").update(script).digest("base64")}`;
  const serverEntry = pathToFileURL(path.join(dist, "server", "fragment.server.js")).href;

  let fragmentHandler;
  const loadFragmentHandler = () => {
    fragmentHandler ??= import(serverEntry)
      .then((mod) => mod.createFragmentProvider({ clientScript: scriptPath, integrity }))
      .catch((error) => {
        fragmentHandler = undefined;
        throw error;
      });
    return fragmentHandler;
  };

  function serveScript(req, res) {
    const origin = req.headers.origin;
    if (origin) {
      if (!origins.includes(origin)) return sendJson(res, 403, { error: "Origin not allowed" });
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    // The path is stable across deploys, so clients must revalidate against the SRI hash.
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(req.method === "HEAD" ? undefined : script);
  }

  return async function handleRequest(req, res) {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === scriptPath) return serveScript(req, res);
    try {
      return await (await loadFragmentHandler())(req, res);
    } catch (error) {
      console.error(`[${appName}] failed to serve fragment`, error);
      if (!res.headersSent) return sendJson(res, 500, { error: "Fragment unavailable" });
      res.destroy();
    }
  };
}
