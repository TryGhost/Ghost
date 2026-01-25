import { resolve } from "path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";

import { emberAssetsPlugin } from "./vite-ember-assets";
import { ghostBackendProxyPlugin } from "./vite-backend-proxy";
import { deepLinksPlugin } from "./vite-deep-links";

export const GHOST_URL = process.env.GHOST_URL ?? "http://localhost:2368/";
const GHOST_CARDS_PATH = resolve(__dirname, "../../ghost/core/core/frontend/src/cards");

/**
 * Extracts the subdirectory path from GHOST_URL.
 * e.g., "http://localhost:2368/blog/" -> "/blog"
 *       "http://localhost:2368/" -> ""
 */
export function getSubdir(): string {
    const url = new URL(GHOST_URL);
    return url.pathname.replace(/\/$/, '');
}

/**
 * Computes the Vite base path.
 * - If GHOST_CDN_URL is set, use it (for CDN deployments)
 * - Otherwise, use the subdir + /ghost (e.g., "/ghost" or "/blog/ghost")
 * - For builds without CDN, use "./" for relative paths in index-forward.html
 */
function getBase(command: 'build' | 'serve'): string {
    if (process.env.GHOST_CDN_URL) {
        return process.env.GHOST_CDN_URL;
    }
    // During build, use relative paths so index-forward.html works when served from any subdir
    if (command === 'build') {
        return './';
    }
    // During dev, use absolute path based on GHOST_URL subdir
    return `${getSubdir()}/ghost`;
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    base: getBase(command),
    plugins: [react(), emberAssetsPlugin(), ghostBackendProxyPlugin(), deepLinksPlugin(), tsconfigPaths()],
    define: {
        "process.env.DEBUG": false, // Shim env var utilized by the @tryghost/nql package
    },
    server: {
        port: 5174,
        allowedHosts: true
    },
    resolve: {
        alias: {
            "@ghost-cards": GHOST_CARDS_PATH,
            // TODO: Remove this when @tryghost/nql is updated
            mingo: resolve(__dirname, "../../node_modules/mingo/dist/mingo.js"),
        },
        // Shim node modules utilized by the @tryghost/nql package
        external: ["fs", "path", "util"],
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./test-utils/setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
}));
