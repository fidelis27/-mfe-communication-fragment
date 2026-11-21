import { createFragmentHandler } from "@lib-core-mfe/fragment-frontend/server";
import Root from "./Root";

export function createFragmentProvider({
  clientScript,
  integrity,
}: {
  clientScript: string;
  integrity?: string;
}) {
  return createFragmentHandler({
    appName: "mfe-dashboard",
    basePath: "/api/fragments",
    fragments: {
      dashboard: { Component: Root, clientScript, integrity, getProps: () => ({}) },
    },
    onError: (error) => console.error("[mfe-dashboard] render error", error),
  });
}
