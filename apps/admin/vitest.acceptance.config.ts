import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { sharedDefine, sharedResolve } from "./vite.shared";

/**
 * Acceptance tier: full-app tests in real Chromium via Vitest Browser Mode,
 * against a fake Ghost Admin API (test-utils/acceptance/). Unit tests stay
 * in vite.config.ts (jsdom).
 */
export default defineConfig({
    plugins: [tailwindcss() as PluginOption, react()],
    // Serves the MSW service worker script; scoped to the test config so it
    // never ends up in the production build's public assets.
    publicDir: "./test-utils/acceptance/public",
    define: sharedDefine,
    optimizeDeps: {
        // Scan every app module so deps behind lazy routes are pre-bundled up
        // front — mid-run discovery reloads the test page and flakes the
        // suite. Test files and screen helpers import test-lane modules the
        // browser bundler can't process; vitest serves those itself.
        entries: ["src/**/*.{ts,tsx}", "!src/**/*.test.*", "!src/**/*.screen.ts"],
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
            // Failure screenshots land in __screenshots__/ (gitignored).
            screenshotFailures: true,
            // Match the e2e suite's desktop viewport — the admin chrome
            // collapses into mobile menus at the vitest default (414px).
            viewport: { width: 1280, height: 800 },
        },
    },
});
