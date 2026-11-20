import { registerFragment } from "@lib-core-mfe/fragment-frontend/provider";
import Root from "./Root";

registerFragment("admin", Root, { appName: "mfe-admin" });
