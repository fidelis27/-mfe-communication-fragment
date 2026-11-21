import type { IncomingMessage, ServerResponse } from "node:http";

export const BFF_PATH: string;
export function providersFromEnv(env: Record<string, string | undefined>): Record<string, string>;
export function createFragmentBff(options: {
  providers: Record<string, string>;
  basePath?: string;
}): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<unknown>;
