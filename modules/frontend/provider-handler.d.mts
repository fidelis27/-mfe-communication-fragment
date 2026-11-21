import type { IncomingMessage, ServerResponse } from "node:http";

export const BASE_PATH: string;
export function parseHostOrigins(value: string | undefined): string[] | string;
export function createProviderHandler(options: {
  appName: string;
  fragmentName: string;
  distRoots: string[];
  hostOrigins: string | undefined;
  basePath?: string;
}): (req: IncomingMessage, res: ServerResponse) => Promise<unknown>;
