import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { sharedDefine, sharedResolve } from "./vite.shared";

/**
 * Acceptance tier: full-app tests running in a real Chromium instance via
 * Vitest Browser Mode, with the Ghost Admin API mocked by MSW (see
 * test-utils/acceptance/). Unit tests stay in vite.config.ts (jsdom).
 *
 * Run with: pnpm test:acceptance
 */
export default defineConfig({
    plugins: [tailwindcss() as PluginOption, react(), tsconfigPaths()],
    // Serves the MSW service worker script; scoped to the test config so it
    // never ends up in the production build's public assets.
    publicDir: "./test-utils/acceptance/public",
    define: sharedDefine,
    optimizeDeps: {
        // Point the dep scanner at every app module (not just the html entry)
        // so deps behind lazy route imports are discovered and pre-bundled up
        // front — if Vite's dep optimizer discovers them mid-run it reloads
        // the test page, which duplicates React and flakes the suite ("Vite
        // unexpectedly reloaded a test"). Test files are excluded: they
        // import node-side tooling (vitest → vite → fsevents) the browser
        // bundler can't process, and vitest already treats them as entries.
        entries: ["src/**/*.{ts,tsx}", "!src/**/*.test.*"],
    },
    resolve: sharedResolve,
    test: {
        name: "acceptance",
        include: ["src/**/*.acceptance.test.tsx"],
        setupFiles: ["./test-utils/acceptance/setup.ts"],
        expect: {
            // Full-app renders are slower than unit renders; the harness's
            // toHaveCount matcher derives its polling from this too.
            poll: { timeout: 5000 },
        },
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            // Match the e2e suite's desktop viewport — the admin chrome
            // collapses into mobile menus at the vitest default (414px).
            viewport: { width: 1280, height: 800 },
        },
    },
});
