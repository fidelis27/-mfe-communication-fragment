import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { createProviderHandler } from "../modules/frontend/provider-handler.mjs";

const [distPath, appName, fragmentName, portValue, ...hostOrigins] = process.argv.slice(2);
const port = Number(portValue);

if (!distPath || !appName || !fragmentName || !Number.isInteger(port) || hostOrigins.length === 0) {
  throw new Error(
    "Usage: node scripts/module-serve.mjs <distPath> <appName> <fragmentName> <port> <hostOrigin...>",
  );
}

const handler = createProviderHandler({
  appName,
  fragmentName,
  distRoots: [path.resolve(distPath)],
  hostOrigins: hostOrigins.join(","),
});
const server = createServer((request, response) => {
  void handler(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`${appName} fragment provider listening on http://127.0.0.1:${port}/api/fragments`);
});

process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
