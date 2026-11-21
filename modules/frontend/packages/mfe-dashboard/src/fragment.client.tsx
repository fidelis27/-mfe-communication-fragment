import { registerFragment } from "@lib-core-mfe/fragment-frontend/provider";
import Root from "./Root";

registerFragment("dashboard", Root, { appName: "mfe-dashboard" });
