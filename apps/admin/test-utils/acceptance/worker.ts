import { http, HttpResponse } from "msw";
import { setupWorker, type SetupWorker } from "msw/browser";

/**
 * MSW worker lifecycle for the acceptance harness.
 *
 * Handler layering (highest priority first):
 *   1. Runtime handlers registered per test via `registerAdminApiHandler` — the
 *      resource handlers (`mockTags`, ...) and any boot overrides passed to
 *      `renderAdminApp`.
 *   2. The default shell boot table (settings/config/site/me + sidebar
 *      extras) — installed once at worker start so `resetHandlers()` restores
 *      it between tests.
 *   3. A catch-all for anything else under /ghost/api/admin/: records the miss
 *      and responds 418 listing the currently mocked routes. Recorded misses
 *      fail the test in afterEach (see `allowUnmockedRequests`), so a spec
 *      immediately sees which request it forgot to declare.
 * Non-admin-API requests (modules, assets) bypass the worker entirely.
 */

const ADMIN_API_PATTERN = /\/ghost\/api\/admin\//;
const ADMIN_API_PREFIX = /^.*\/ghost\/api\/admin/;

/** The request's path + query, relative to the admin API root (e.g. "/tags/?limit=100"). */
function toAdminApiPath(url: string): string {
    return url.replace(ADMIN_API_PREFIX, "");
}

// Routes listed by the 418 catch-all. Seeded with the boot table at worker
// start (always the first entries); per-test registrations are appended and
// trimmed back to the boot entries on reset.
const registeredRoutes: string[] = [];
let bootRouteCount = 0;

export function registerRoute(method: string, path: string | RegExp): void {
    registeredRoutes.push(`${method} ${path}`);
}

// 418 bookkeeping: every admin API request that got a 418 during the current
// test. setup.ts fails the test in afterEach unless the test opted out.
let recorded418s: string[] = [];
let unmockedRequestsAllowed = false;

/** Record a 418-serving request so `verifyNoUnmockedRequests` can fail the test. */
export function record418(description: string): void {
    recorded418s.push(description);
}

/**
 * Per-test opt-out from the fail-on-unmocked-request check in afterEach.
 * Resets automatically after each test.
 */
export function allowUnmockedRequests(): void {
    unmockedRequestsAllowed = true;
}

/**
 * Called from afterEach: throws if any admin API request was served a 418
 * during the test (unless `allowUnmockedRequests()` opted out), then resets
 * the bookkeeping either way.
 */
export function verifyNoUnmockedRequests(): void {
    const requests = recorded418s;
    const allowed = unmockedRequestsAllowed;
    recorded418s = [];
    unmockedRequestsAllowed = false;

    if (!allowed && requests.length > 0) {
        throw new Error(
            [
                "Admin API request(s) went unmocked (served a 418) during this test:",
                ...requests.map((request) => `  - ${request}`),
                "",
                "Declare them with a resource handler (mockTags, ...) or a renderAdminApp boot override,",
                "or call allowUnmockedRequests() at the start of the test to opt out.",
            ].join("\n")
        );
    }
}

let worker: SetupWorker | undefined;

type AdminApiResolver = (request: Request, apiPath: string) => Promise<Response | undefined> | Response | undefined;

/**
 * Register a runtime admin-API handler. The resolver receives the request and
 * its admin-relative path; returning `undefined` falls through to
 * lower-priority handlers (boot table, then the 418 catch-all).
 */
export function registerAdminApiHandler(resolver: AdminApiResolver): void {
    if (!worker) {
        throw new Error(
            "MSW worker is not running — acceptance tests must be run through vitest.acceptance.config.ts (its setup file starts the worker)"
        );
    }

    worker.use(
        http.all(ADMIN_API_PATTERN, async ({ request }) => {
            return await resolver(request, toAdminApiPath(request.url));
        })
    );
}

export interface StartMockWorkerOptions {
    /** The persistent lowest-priority resolver for the shell boot table. */
    resolver: AdminApiResolver;
    /** "METHOD path" descriptions of the boot table, for the 418 route listing. */
    routes: string[];
}

export async function startMockWorker({ resolver, routes }: StartMockWorkerOptions): Promise<SetupWorker> {
    if (worker) {
        return worker;
    }

    registeredRoutes.push(...routes);
    bootRouteCount = registeredRoutes.length;

    worker = setupWorker(
        // Default shell boot table — persistent across resetHandlers().
        http.all(ADMIN_API_PATTERN, async ({ request }) => {
            return await resolver(request, toAdminApiPath(request.url));
        }),
        // Catch-all: any admin API request nothing above handled.
        http.all(ADMIN_API_PATTERN, ({ request }) => {
            const apiPath = toAdminApiPath(request.url);
            record418(`${request.method} ${apiPath}`);
            return new HttpResponse(
                [
                    "No matching mock found. If this request is needed for the test, declare it with a resource handler (mockTags, ...) or a renderAdminApp boot override",
                    "",
                    `Request: ${request.method} ${apiPath}`,
                    "",
                    "Currently mocked:",
                    ...registeredRoutes,
                ].join("\n"),
                { status: 418 }
            );
        })
    );

    await worker.start({
        serviceWorker: { url: "/mockServiceWorker.js" },
        onUnhandledRequest: "bypass",
        quiet: true,
    });

    return worker;
}

export function resetMockWorker(): void {
    worker?.resetHandlers();
    registeredRoutes.length = bootRouteCount;
}
