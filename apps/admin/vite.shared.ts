import { createRequire } from "node:module";
import { resolve } from "path";

const require = createRequire(import.meta.url);

/**
 * Config fragments shared by vite.config.ts (dev/build + unit tests) and
 * vitest.acceptance.config.ts, so the TODO-gated @tryghost/nql shims live in
 * exactly one place.
 */

const GHOST_CARDS_PATH = resolve(__dirname, "../../ghost/core/core/frontend/src/cards");

export const sharedDefine = {
    "process.env.DEBUG": false, // Shim env var utilized by the @tryghost/nql package
};

export const sharedResolve = {
    tsconfigPaths: true,
    alias: {
        "@ghost-cards": GHOST_CARDS_PATH,
        // TODO: Remove this when @tryghost/nql is updated
        mingo: require.resolve("mingo/dist/mingo.js"),
    },
};
