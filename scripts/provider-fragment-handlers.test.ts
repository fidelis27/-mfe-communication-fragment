// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hermetic: ignore any real `dist` built in the workspace; only temp folders count.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const { tmpdir } = await import("node:os");
  return {
    ...actual,
    existsSync: (target: string) =>
      String(target).startsWith(tmpdir()) && actual.existsSync(target),
  };
});

const providers = ["activity", "admin", "dashboard", "institution", "student"] as const;
const hostOrigin = "https://host.example.com";

type Handler = (req: IncomingMessage, res: ServerResponse) => unknown;

const tempDirs: string[] = [];

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "provider-fragment-"));
  tempDirs.push(dir);
  return dir;
}

/** A `dist` folder with the browser bundle and a stub server bundle. */
function createBuiltFragment(dist: string, name: string) {
  mkdirSync(path.join(dist, "modules"), { recursive: true });
  mkdirSync(path.join(dist, "server"), { recursive: true });
  writeFileSync(path.join(dist, "modules", `${name}.js`), "console.log('client');");
  writeFileSync(
    path.join(dist, "server", "fragment.server.js"),
    `export function createFragmentProvider({ clientScript, integrity }) {
       return async (_req, res) => {
         res.setHeader("x-fragment-script", clientScript);
         res.setHeader("x-fragment-integrity", integrity);
         res.end("<div data-fragment-root></div>");
       };
     }`,
  );
}

async function loadHandler(name: string, cwd: string, origins: string | undefined) {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  vi.stubEnv("MFE_HOST_ORIGINS", origins);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const module = (await import(
    `../modules/frontend/packages/mfe-${name}/api/fragments/[...path].ts`
  )) as {
    default: Handler;
  };
  return module.default;
}

async function request(handler: Handler, url: string, headers: Record<string, string> = {}) {
  const responseHeaders: Record<string, string> = {};
  let body = "";
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader: (key: string, value: string) => {
      responseHeaders[key.toLowerCase()] = value;
    },
    end: (chunk?: string | Buffer) => {
      body = chunk ? chunk.toString() : "";
    },
  } as unknown as ServerResponse;
  await handler({ method: "GET", url, headers } as IncomingMessage, res);
  return { status: res.statusCode, headers: responseHeaders, body };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe.each(providers)("mfe-%s fragment handler", (name) => {
  const scriptUrl = `/api/fragments/assets/${name}.client.js`;

  it("renders the fragment when cwd is the project Root Directory", async () => {
    const cwd = tempDir();
    createBuiltFragment(path.join(cwd, "dist"), name);

    const response = await request(
      await loadHandler(name, cwd, hostOrigin),
      `/api/fragments/${name}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toContain("data-fragment-root");
    expect(response.headers["x-fragment-script"]).toBe(scriptUrl);
    expect(response.headers["x-fragment-integrity"]).toMatch(/^sha384-/);
  });

  it("renders the fragment when cwd is the repository root", async () => {
    const cwd = tempDir();
    createBuiltFragment(path.join(cwd, `modules/frontend/packages/mfe-${name}/dist`), name);

    const response = await request(
      await loadHandler(name, cwd, hostOrigin),
      `/api/fragments/${name}`,
    );

    expect(response.status).toBe(200);
  });

  it("serves the client script only to allowed Host origins", async () => {
    const cwd = tempDir();
    createBuiltFragment(path.join(cwd, "dist"), name);
    const handler = await loadHandler(name, cwd, hostOrigin);

    const allowed = await request(handler, scriptUrl, { origin: hostOrigin });
    expect(allowed.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe(hostOrigin);
    expect(allowed.body).toBe("console.log('client');");

    const denied = await request(handler, scriptUrl, { origin: "https://evil.example.com" });
    expect(denied.status).toBe(403);
  });

  it("explains a missing MFE_HOST_ORIGINS instead of crashing on import", async () => {
    const response = await request(
      await loadHandler(name, tempDir(), undefined),
      `/api/fragments/${name}`,
    );

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: expect.stringContaining("MFE_HOST_ORIGINS"),
    });
  });

  it("rejects host origins with a trailing slash", async () => {
    const response = await request(
      await loadHandler(name, tempDir(), `${hostOrigin}/`),
      `/api/fragments/${name}`,
    );

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: expect.stringContaining("exact origins") });
  });

  it("explains a missing build", async () => {
    const response = await request(
      await loadHandler(name, tempDir(), hostOrigin),
      `/api/fragments/${name}`,
    );

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: expect.stringContaining("run build:module"),
    });
  });
});
