import { createFragmentBff, providersFromEnv } from "../../server/fragment-bff.mjs";

export default createFragmentBff({ providers: providersFromEnv(process.env) });
