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
    appName: "mfe-activity",
    basePath: "/api/fragments",
    fragments: {
      activity: { Component: Root, clientScript, integrity, getProps: () => ({}) },
    },
    onError: (error) => console.error("[mfe-activity] render error", error),
  });
}
