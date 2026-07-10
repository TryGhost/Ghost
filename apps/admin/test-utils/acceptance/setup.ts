import { afterEach, beforeAll } from "vitest";
import { cleanup } from "vitest-browser-react";

import "./matchers";
import { defaultBootResolver, defaultBootRoutes } from "./boot";
import { resetMockWorker, startMockWorker, verifyNoUnmockedRequests } from "./worker";

beforeAll(async () => {
    await startMockWorker({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
});

afterEach(async () => {
    // Unmount the app before touching the mock worker or the URL — resetting
    // either while the app is live triggers navigations/refetches against a
    // handler-less worker, which surface as unhandled rejections. (Query
    // caches need no teardown: each renderAdminApp gets a fresh QueryClient.)
    await cleanup();

    resetMockWorker();
    window.location.hash = "";

    // Last, after teardown is safely done: fail the test if any admin API
    // request went unmocked (was served a 418) while it ran.
    verifyNoUnmockedRequests();
});
