import { resolve } from "path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";

import { emberAssetsPlugin } from "./vite-ember-assets";
import { ghostBackendProxyPlugin } from "./vite-backend-proxy";

const GHOST_CARDS_PATH = resolve(
    __dirname,
    "../../ghost/core/core/frontend/src/cards"
);

// https://vite.dev/config/
export default defineConfig({
    base: process.env.GHOST_CDN_URL ?? "/ghost",
    plugins: [
        react(),
        emberAssetsPlugin(),
        ghostBackendProxyPlugin(),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            "@ghost-cards": GHOST_CARDS_PATH,
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    },
});
