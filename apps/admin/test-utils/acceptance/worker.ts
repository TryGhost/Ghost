import { http, HttpResponse } from "msw";
import { setupWorker, type SetupWorker } from "msw/browser";

/**
 * MSW worker lifecycle for the acceptance harness.
 *
 * Handler layering (highest priority first):
 *   1. Runtime handlers registered per test via `registerAdminApiHandler` /
 *      `mockEndpoint` — the resource handlers (`mockTags`, `mockMembers`, ...)
 *      and any boot overrides passed to `renderAdminApp`.
 *   2. The default shell boot table (settings/config/site/me + sidebar
 *      extras) — installed once at worker start so `resetHandlers()` restores
 *      it between tests.
 *   3. A catch-all for anything else under /ghost/api/admin/: records the miss
 *      and responds 418 listing the currently mocked routes. Recorded misses
 *      fail the test in afterEach (see `allowUnmockedRequests`), so a spec
 *      immediately sees which request it forgot to declare.
 *   4. Catch-alls for the known external origins the app calls (see
 *      `EXTERNAL_URL_BLOCKLIST`): same record-and-418 treatment, so a
 *      forgotten `mockEndpoint` fails the test instead of hitting the real
 *      network from CI.
 * All other non-admin-API requests (modules, assets) bypass the worker.
 */

const ADMIN_API_PATTERN = /\/ghost\/api\/admin\//;
const ADMIN_API_PREFIX = /^.*\/ghost\/api\/admin/;

/** The request's path + query, relative to the admin API root (e.g. "/tags/?limit=100"). */
function toAdminApiPath(url: string): string {
    return url.replace(ADMIN_API_PREFIX, "");
}

/**
 * External origins the admin app is known to call at runtime. Requests to
 * these must be declared with `mockEndpoint` — they get the same
 * record-and-418 treatment as unmocked admin API requests instead of the
 * `onUnhandledRequest: "bypass"` default (which exists for vite modules and
 * assets, not app traffic).
 */
const EXTERNAL_URL_BLOCKLIST: string[] = [
    // The what's-new changelog feed (src/whats-new/hooks/use-changelog.ts)
    // and anything else on ghost.org.
    "https://ghost.org/*",
    // The ActivityPub API root (admin-x-framework utils/helpers.ts).
    "*/.ghost/activitypub/*",
];

/**
 * External requests that are shell boot chrome: fired on every render
 * regardless of route, so they are served by default and specs never mention
 * them (mirroring the admin-API boot table). Override per test with
 * `mockEndpoint`, which wins over these.
 */
const DEFAULT_EXTERNAL_RESPONSES: Array<{ method: string; url: string; response: unknown }> = [
    // The what's-new changelog feed: an empty feed keeps the user menu quiet.
    { method: "GET", url: "https://ghost.org/changelog.json", response: { posts: [] } },
];

// Routes listed by the 418 catch-all. Seeded with the boot table at worker
// start (always the first entries); per-test registrations are appended and
// trimmed back to the boot entries on reset.
const registeredRoutes: string[] = [];
let bootRouteCount = 0;

export function registerRoute(method: string, path: string | RegExp): void {
    registeredRoutes.push(`${method} ${path}`);
}

// 418 bookkeeping: every request that got a 418 during the current test.
// setup.ts fails the test in afterEach unless the test opted out.
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
 * Called from afterEach: throws if any request was served a 418 during the
 * test (unless `allowUnmockedRequests()` opted out), then resets the
 * bookkeeping either way.
 */
export function verifyNoUnmockedRequests(): void {
    const requests = recorded418s;
    const allowed = unmockedRequestsAllowed;
    recorded418s = [];
    unmockedRequestsAllowed = false;

    if (!allowed && requests.length > 0) {
        throw new Error(
            [
                "Request(s) went unmocked (served a 418) during this test:",
                ...requests.map((request) => `  - ${request}`),
                "",
                "Declare admin API requests with a resource handler (mockTags, mockMembers, ...) or a renderAdminApp boot override,",
                "external requests with mockEndpoint(method, url, response),",
                "or call allowUnmockedRequests() at the start of the test to opt out.",
            ].join("\n")
        );
    }
}

// In-flight admin-API ledger, fed by the MSW lifecycle events installed at
// worker start: requestId → "METHOD path". `settleAdminApiRequests` drains it
// in afterEach so a request started at the tail of one test can't resolve
// against the next test's handler table (or 418 after its own test already
// passed — the false-green race).
const inFlightAdminApiRequests = new Map<string, string>();

function trackInFlightAdminApiRequests(worker: SetupWorker): void {
    worker.events.on("request:start", ({ request, requestId }) => {
        if (ADMIN_API_PATTERN.test(request.url)) {
            inFlightAdminApiRequests.set(requestId, `${request.method} ${toAdminApiPath(request.url)}`);
        }
    });
    // "request:end" fires for every request the worker saw — handled,
    // bypassed or unhandled — so each tracked start gets exactly one delete.
    worker.events.on("request:end", ({ requestId }) => {
        inFlightAdminApiRequests.delete(requestId);
    });
}

export interface SettleAdminApiRequestsOptions {
    /** How long the in-flight ledger must stay continuously empty before resolving. */
    quietMs?: number;
    /** Overall deadline; throws listing the still-pending requests when exceeded. */
    timeoutMs?: number;
}

const SETTLE_POLL_MS = 10;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Resolves once no admin API request has been in flight for `quietMs`
 * continuously. Called between `cleanup()` (an unmounted app can't start new
 * requests) and `resetMockWorker()` (in-flight mocked requests must still hit
 * their handlers), so stragglers are drained inside the test that caused them.
 */
export async function settleAdminApiRequests({ quietMs = 50, timeoutMs = 2000 }: SettleAdminApiRequestsOptions = {}): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let quietSince: number | undefined;

    while (Date.now() < deadline) {
        if (inFlightAdminApiRequests.size === 0) {
            quietSince ??= Date.now();
            if (Date.now() - quietSince >= quietMs) {
                return;
            }
        } else {
            quietSince = undefined;
        }
        await sleep(SETTLE_POLL_MS);
    }

    if (inFlightAdminApiRequests.size === 0) {
        return;
    }

    throw new Error(
        [
            `Admin API request(s) still in flight ${timeoutMs}ms after the test finished:`,
            ...[...inFlightAdminApiRequests.values()].map((description) => `  - ${description}`),
        ].join("\n")
    );
}

let worker: SetupWorker | undefined;

function runningWorker(): SetupWorker {
    if (!worker) {
        throw new Error(
            "MSW worker is not running — acceptance tests must be run through vitest.acceptance.config.ts (its setup file starts the worker)"
        );
    }
    return worker;
}

type AdminApiResolver = (request: Request, apiPath: string) => Promise<Response | undefined> | Response | undefined;

/**
 * Register a runtime admin-API handler. The resolver receives the request and
 * its admin-relative path; returning `undefined` falls through to
 * lower-priority handlers (boot table, then the 418 catch-all).
 */
export function registerAdminApiHandler(resolver: AdminApiResolver): void {
    runningWorker().use(
        http.all(ADMIN_API_PATTERN, async ({ request }) => {
            return await resolver(request, toAdminApiPath(request.url));
        })
    );
}

export interface MockEndpointOptions {
    status?: number;
}

/**
 * Mock one non-admin-API endpoint (an absolute URL, e.g.
 * `mockEndpoint("GET", "https://ghost.org/changelog.json", {posts: []})`) for
 * the current test. Registered like any runtime handler, so it wins over the
 * external-origin blocklist and resets between tests. Admin API requests
 * belong to the resource handlers / boot overrides, not this.
 */
export function mockEndpoint(method: string, url: string, response: unknown, { status = 200 }: MockEndpointOptions = {}): void {
    const expectedMethod = method.toUpperCase();

    runningWorker().use(
        http.all(url, ({ request }) => {
            if (request.method !== expectedMethod) {
                return undefined;
            }
            return HttpResponse.json(response as Record<string, unknown>, { status });
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

    registeredRoutes.push(...routes, ...DEFAULT_EXTERNAL_RESPONSES.map(({ method, url }) => `${method} ${url}`));
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
                    "No matching mock found. If this request is needed for the test, declare it with a resource handler (mockTags, mockMembers, ...) or a renderAdminApp boot override",
                    "",
                    `Request: ${request.method} ${apiPath}`,
                    "",
                    "Currently mocked:",
                    ...registeredRoutes,
                ].join("\n"),
                { status: 418 }
            );
        }),
        // External boot chrome — persistent defaults, like the boot table.
        ...DEFAULT_EXTERNAL_RESPONSES.map(({ method, url, response }) =>
            http.all(url, ({ request }) => {
                if (request.method !== method) {
                    return undefined;
                }
                return HttpResponse.json(response as Record<string, unknown>);
            })
        ),
        // Known external origins nothing above handled: fail fast instead of
        // letting the request escape to the real network.
        ...EXTERNAL_URL_BLOCKLIST.map((pattern) =>
            http.all(pattern, ({ request }) => {
                record418(`${request.method} ${request.url} (external origin)`);
                return new HttpResponse(
                    `No matching mock found for external origin. Declare it with mockEndpoint("${request.method}", "${request.url}", ...)`,
                    { status: 418 }
                );
            })
        )
    );

    trackInFlightAdminApiRequests(worker);

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
