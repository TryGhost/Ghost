import { resolve } from "path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";

import { emberAssetsPlugin } from "./vite-ember-assets";
import { ghostBackendProxyPlugin } from "./vite-backend-proxy";
import { deepLinksPlugin } from "./vite-deep-links";

const GHOST_CARDS_PATH = resolve(__dirname, "../../ghost/core/core/frontend/src/cards");

// Local Koenig development: set KOENIG_PATH to the koenig-lexical package source
// e.g., KOENIG_PATH=../Koenig/packages/koenig-lexical/src/index.js (relative to monorepo root)
// or KOENIG_PATH=/absolute/path/to/koenig-lexical/src/index.js
const MONOREPO_ROOT = resolve(__dirname, "../..");
const KOENIG_PATH = process.env.KOENIG_PATH
    ? resolve(MONOREPO_ROOT, process.env.KOENIG_PATH)
    : undefined;

// https://vite.dev/config/
export default defineConfig({
    base: process.env.GHOST_CDN_URL ?? "/ghost",
    plugins: [react(), emberAssetsPlugin(), ghostBackendProxyPlugin(), deepLinksPlugin(), tsconfigPaths()],
    define: {
        "process.env.DEBUG": false, // Shim env var utilized by the @tryghost/nql package
    },
    server: {
        host: true,
        allowedHosts: true
    },
    resolve: {
        alias: {
            "@ghost-cards": GHOST_CARDS_PATH,
            // TODO: Remove this when @tryghost/nql is updated
            mingo: resolve(__dirname, "../../node_modules/mingo/dist/mingo.js"),
            // Local Koenig development: alias to local source for HMR
            ...(KOENIG_PATH ? { "@tryghost/koenig-lexical": KOENIG_PATH } : {}),
        },
        // Shim node modules utilized by the @tryghost/nql package
        external: ["fs", "path", "util"],
    },
    // When using local Koenig source, exclude from optimization since it's pre-built
    optimizeDeps: KOENIG_PATH ? {
        exclude: ["@tryghost/koenig-lexical"],
    } : {},
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./test-utils/setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
});
