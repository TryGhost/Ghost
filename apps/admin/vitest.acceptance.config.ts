import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { sharedDefine, sharedResolve } from "./vite.shared";

/**
 * Acceptance tier: full-app tests in real Chromium via Vitest Browser Mode,
 * against a fake Ghost Admin API (test-utils/acceptance/). Unit tests stay
 * in vite.config.ts (jsdom).
 */

/**
 * Every dependency the suite imports at runtime, pre-bundled up front.
 * `noDiscovery` below turns the optimizer's runtime discovery off, so this
 * list is the whole universe: a dep missing from it fails the importing test
 * loudly instead of triggering a mid-run re-bundle + page reload (which
 * manifested as duplicate-React invalid-hook crashes on cold caches).
 *
 * When a test fails naming a missing dependency, add it here. Deps that only
 * a linked workspace package declares can't resolve from this app's root
 * under pnpm isolation — chain through the owning package
 * ("@tryghost/shade > recharts"). To regenerate from scratch: temporarily
 * remove `noDiscovery`, run a cold suite (rm -rf node_modules/.vite &&
 * pnpm test:acceptance), then copy the keys of
 * node_modules/.vite/vitest/<hash>/deps/_metadata.json's "optimized" object
 * (minus the "vitest > ..." entries, which Vitest injects itself) and chain
 * the workspace-owned ones.
 */
const OPTIMIZED_DEPS = [
    "@svg-maps/world",
    "@tanstack/react-query",
    "@tanstack/react-virtual",
    "@tryghost/activitypub > @radix-ui/react-form",
    "@tryghost/activitypub > dompurify",
    "@tryghost/activitypub > html2canvas-pro",
    "@tryghost/admin-x-framework > @ebay/nice-modal-react",
    "@tryghost/admin-x-framework > @sentry/react",
    "@tryghost/admin-x-framework > @tinybirdco/charts",
    "@tryghost/admin-x-framework > bson-objectid",
    "@tryghost/admin-x-framework > react-hot-toast",
    "@tryghost/admin-x-settings > @codemirror/lang-css",
    "@tryghost/admin-x-settings > @codemirror/lang-html",
    "@tryghost/admin-x-settings > @codemirror/lang-javascript",
    "@tryghost/admin-x-settings > @codemirror/lang-json",
    "@tryghost/admin-x-settings > @codemirror/lang-markdown",
    "@tryghost/admin-x-settings > @codemirror/lang-yaml",
    "@tryghost/admin-x-settings > @codemirror/search",
    "@tryghost/admin-x-settings > @codemirror/theme-one-dark",
    "@tryghost/admin-x-settings > @dnd-kit/sortable",
    "@tryghost/admin-x-settings > @tryghost/admin-x-design-system > @dnd-kit/core",
    "@tryghost/admin-x-settings > @tryghost/admin-x-design-system > @dnd-kit/utilities",
    "@tryghost/admin-x-settings > @tryghost/admin-x-design-system > @radix-ui/react-radio-group",
    "@tryghost/admin-x-settings > @tryghost/admin-x-design-system > lodash-es",
    "@tryghost/admin-x-settings > @tryghost/admin-x-design-system > react-colorful",
    "@tryghost/admin-x-settings > @tryghost/color-utils",
    "@tryghost/admin-x-settings > @tryghost/custom-fonts",
    "@tryghost/admin-x-settings > @tryghost/limit-service",
    "@tryghost/admin-x-settings > @tryghost/nql",
    "@tryghost/admin-x-settings > @tryghost/timezone-data",
    "@tryghost/admin-x-settings > @uiw/react-codemirror",
    "@tryghost/admin-x-settings > jszip",
    "@tryghost/admin-x-settings > react-select",
    "@tryghost/admin-x-settings > react-select/async",
    "@tryghost/admin-x-settings > react-select/async-creatable",
    "@tryghost/admin-x-settings > react-select/creatable",
    "@tryghost/admin-x-settings > semver/functions/parse",
    "@tryghost/nql-lang",
    "@tryghost/shade > @hookform/resolvers/zod",
    "@tryghost/shade > @number-flow/react",
    "@tryghost/shade > @radix-ui/react-alert-dialog",
    "@tryghost/shade > @radix-ui/react-avatar",
    "@tryghost/shade > @radix-ui/react-checkbox",
    "@tryghost/shade > @radix-ui/react-context-menu",
    "@tryghost/shade > @radix-ui/react-dialog",
    "@tryghost/shade > @radix-ui/react-dropdown-menu",
    "@tryghost/shade > @radix-ui/react-hover-card",
    "@tryghost/shade > @radix-ui/react-label",
    "@tryghost/shade > @radix-ui/react-popover",
    "@tryghost/shade > @radix-ui/react-select",
    "@tryghost/shade > @radix-ui/react-separator",
    "@tryghost/shade > @radix-ui/react-slider",
    "@tryghost/shade > @radix-ui/react-slot",
    "@tryghost/shade > @radix-ui/react-switch",
    "@tryghost/shade > @radix-ui/react-tabs",
    "@tryghost/shade > @radix-ui/react-toggle",
    "@tryghost/shade > @radix-ui/react-toggle-group",
    "@tryghost/shade > @radix-ui/react-tooltip",
    "@tryghost/shade > class-variance-authority",
    "@tryghost/shade > clsx",
    "@tryghost/shade > cmdk",
    "@tryghost/shade > color",
    "@tryghost/shade > country-flag-icons",
    "@tryghost/shade > country-flag-icons/react/3x2",
    "@tryghost/shade > lucide-react",
    "@tryghost/shade > react-day-picker",
    "@tryghost/shade > react-dropzone",
    "@tryghost/shade > react-hook-form",
    "@tryghost/shade > recharts",
    "@tryghost/shade > tailwind-merge",
    "@tryghost/test-data > @faker-js/faker",
    "@xyflow/react",
    "dequal",
    "i18n-iso-countries",
    "moment",
    "moment-timezone",
    "papaparse",
    "react",
    "react-dom",
    "react-dom/client",
    "react-router",
    "react-svg-map",
    "react/jsx-dev-runtime",
    "react/jsx-runtime",
    "sonner",
    "temporal-polyfill",
    "use-debounce",
    "validator",
    "validator/es/lib/isEmail",
    "validator/es/lib/isEmail.js",
    "vitest > @opentelemetry/api",
    "vitest-browser-react",
    "zod",
];

export default defineConfig({
    plugins: [tailwindcss() as PluginOption, react(), tsconfigPaths()],
    // Serves the MSW service worker script; scoped to the test config so it
    // never ends up in the production build's public assets.
    publicDir: "./test-utils/acceptance/public",
    define: sharedDefine,
    optimizeDeps: {
        // No runtime discovery: a dep the optimizer would have found mid-run
        // re-bundles and reloads the page, flaking whichever test is on
        // screen. With discovery off the pre-bundled set is fixed at startup.
        noDiscovery: true,
        include: OPTIMIZED_DEPS,
    },
    resolve: {
        ...sharedResolve,
        // Belt and braces: if a second React copy ever sneaks into the module
        // graph, collapse it instead of crashing hooks.
        dedupe: ["react", "react-dom"],
    },
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
