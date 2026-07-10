import { afterEach, beforeAll } from "vitest";
import { cleanup } from "vitest-browser-react";

import "./matchers";
import { defaultBootResolver, defaultBootRoutes } from "./boot";
import { resetFakeApi, settleRequests, startFakeApi, verifyNoUnhandledRequests } from "./worker";

beforeAll(async () => {
    await startFakeApi({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
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
