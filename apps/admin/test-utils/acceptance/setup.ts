import { afterEach, beforeAll, beforeEach } from "vitest";
import { cleanup } from "vitest-browser-react";

import "./matchers";
import { defaultBootResolver, defaultBootRoutes } from "./boot";
import { isShadeSettingsRun, isShadeSettingsSuite } from "./settings-mode";
import { resetFakeApi, settleRequests, startFakeApi, verifyNoUnhandledRequests } from "./worker";

beforeAll(async () => {
    await startFakeApi({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
});

// SHADE_SETTINGS=1 runs only execute files that declared Shade-mode support
// via enableShadeSettingsMode(); everything else is skipped, not failed —
// suites stay legacy-only until their area is rebuilt (see settings-mode.ts).
beforeEach((ctx) => {
    if (isShadeSettingsRun && !isShadeSettingsSuite()) {
        ctx.skip();
    }
});

afterEach(async () => {
    // Order is load-bearing: unmount first (a live app refetches against a
    // reset worker); drain before the reset (stragglers must hit their
    // declared fakes) and before the verification (late 418s belong to the
    // test that caused them); finally so a drain timeout can't leak handlers
    // or 418 records into the next test.
    await cleanup();
    try {
        await settleRequests();
    } finally {
        resetFakeApi();
        window.location.hash = "";
        verifyNoUnhandledRequests();
    }
});
