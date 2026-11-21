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
    appName: "mfe-institution",
    basePath: "/api/fragments",
    fragments: {
      institution: { Component: Root, clientScript, integrity, getProps: () => ({}) },
    },
    onError: (error) => console.error("[mfe-institution] render error", error),
  });
}
