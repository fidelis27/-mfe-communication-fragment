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
    appName: "mfe-admin",
    basePath: "/api/fragments",
    fragments: {
      admin: { Component: Root, clientScript, integrity, getProps: () => ({}) },
    },
    onError: (error) => console.error("[mfe-admin] render error", error),
  });
}
