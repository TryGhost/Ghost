import { afterEach, beforeAll } from "vitest";
import { cleanup } from "vitest-browser-react";

import "./matchers";
import { defaultBootResolver, defaultBootRoutes } from "./boot";
import { resetFakeApi, settleRequests, startFakeApi, verifyNoUnhandledRequests } from "./worker";

beforeAll(async () => {
    await startFakeApi({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
});

afterEach(async () => {
    // Unmount the app before touching the fake API or the URL — resetting
    // either while the app is live triggers navigations/refetches against a
    // handler-less worker, which surface as unhandled rejections. (Query
    // caches need no teardown: each renderAdminApp gets a fresh QueryClient.)
    await cleanup();

    // Drain in-flight requests while the test's fakes are still installed —
    // after the reset below, a straggler would 418 even though a fake was
    // declared for it; and a straggler that 418s must do so BEFORE the
    // verification below so it is attributed to the test that caused it, not
    // the next one. The finally block keeps teardown exception-safe: even if
    // the drain times out, the fake API is reset and the bookkeeping cleared,
    // so one failing test can't leak handlers or 418 records into the next.
    try {
        await settleRequests();
    } finally {
        resetFakeApi();
        window.location.hash = "";

        // Last, after teardown is safely done: fail the test if any request
        // went unhandled (was served a 418) while it ran.
        verifyNoUnhandledRequests();
    }
});
