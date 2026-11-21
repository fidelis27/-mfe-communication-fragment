import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProviderHandler } from "../../../../../provider-handler.mjs";

const APP_NAME = "mfe-institution";
const FRAGMENT_NAME = "institution";

// Vercel may run the function from the project Root Directory or from the repository root.
const handleRequest = createProviderHandler({
  appName: APP_NAME,
  fragmentName: FRAGMENT_NAME,
  hostOrigins: process.env.MFE_HOST_ORIGINS,
  distRoots: [
    path.resolve(process.cwd(), "dist"),
    path.resolve(process.cwd(), `modules/frontend/packages/${APP_NAME}/dist`),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../dist"),
  ],
});

export default handleRequest;
