import { resolve } from "path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";

import { emberAssetsPlugin } from "./vite-ember-assets";
import { ghostBackendProxyPlugin } from "./vite-backend-proxy";

const GHOST_CARDS_PATH = resolve(__dirname, "../../ghost/core/core/frontend/src/cards");

// https://vite.dev/config/
export default defineConfig({
    base: process.env.GHOST_CDN_URL ?? "/ghost",
    plugins: [react(), emberAssetsPlugin(), ghostBackendProxyPlugin(), tsconfigPaths()],
    define: {
        "process.env.DEBUG": false, // Shim env var utilized by the @tryghost/nql package
    },
    server: {
        host: true,
        allowedHosts: [
            "localhost",
            "127.0.0.1",
            "::1",
            "host.docker.internal",
        ]
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
});
