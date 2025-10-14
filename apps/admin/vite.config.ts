import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { emberAssetsPlugin } from "./vite-ember-assets";

const adminApiProxy = {
    // Proxy requests to the Ghost Admin API. We need to rewrite the
    // cookies and headers for the existing security middleware not to
    // reject the requests.
    "^/ghost/api/.*": {
        changeOrigin: true,
        cookieDomainRewrite: {
            "*": "localhost:2368",
        },
        target: "http://localhost:2368",
    },
};

// https://vite.dev/config/
export default defineConfig({
    base: "/ghost",
    plugins: [react(), emberAssetsPlugin()],
    server: {
        proxy: {
            ...adminApiProxy,

            // Proxy requests for Ghost Admin (Ember) assets
            "^/ghost/assets/.*": {
                target: "http://localhost:2368",
            },
            "^/ghost/ember-cli-live-reload.js": {
                target: "http://localhost:2368",
            },
        },
    },
    preview: {
        proxy: {
            ...adminApiProxy,
        },
    },
});
