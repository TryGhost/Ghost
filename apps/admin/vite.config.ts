import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

import { emberAssetsPlugin } from "./vite-ember-assets";

const GHOST_CARDS_PATH = resolve(__dirname, '../../ghost/core/core/frontend/src/cards');

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths(), emberAssetsPlugin()],
    resolve: {
        alias: {
            '@ghost-cards': GHOST_CARDS_PATH
        }
    },
    server: {
        proxy: {
            // Proxy requests to the Ghost Admin API. We need to rewrite the
            // cookies and headers for the existing security middleware not to
            // reject the requests. 
            "^/ghost/api/.*": {
                changeOrigin: true,
                cookieDomainRewrite: {
                    "*": "localhost:2368",
                },
                headers: {
                    Referrer: "http://localhost:2368",
                },
                target: "http://localhost:2368",
            },

            // Proxy requests to the Ghost Admin assets
            "^/ghost/assets/.*": {
                target: "http://localhost:2368",
            },
            "^/ghost/ember-cli-live-reload.js": {
                target: "http://localhost:2368",
            },
        },
    },
});
