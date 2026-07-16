import { http, HttpResponse } from "msw";
import { setupWorker, type SetupWorker } from "msw/browser";

/**
 * The fake Ghost Admin API: an MSW worker with layered handlers. Per-test
 * registrations (resource fakes, boot overrides, fakeEndpoint) win over the
 * persistent boot table; anything else the worker owns (admin API paths,
 * blocklisted external origins) is recorded and served a 418 that fails the
 * test in afterEach. Everything else (vite modules, assets) bypasses.
 */

const ADMIN_API_PATTERN = /\/ghost\/api\/admin\//;
const ADMIN_API_PREFIX = /^.*\/ghost\/api\/admin/;

/** The request's path + query, relative to the admin API root (e.g. "/tags/?limit=100"). */
function toAdminApiPath(url: string): string {
    return url.replace(ADMIN_API_PREFIX, "");
}

/**
 * External origins the app calls at runtime: 418 unless declared with
 * `fakeEndpoint`. `isMatch` mirrors `pattern` for the in-flight ledger.
 */
const EXTERNAL_URL_BLOCKLIST: Array<{ pattern: string; isMatch: (url: string) => boolean }> = [
    // ghost.org, incl. the what's-new changelog feed (src/whats-new/hooks/use-changelog.ts)
    { pattern: "https://ghost.org/*", isMatch: (url) => url.startsWith("https://ghost.org/") },
    // ActivityPub API root (admin-x-framework utils/helpers.ts)
    { pattern: "*/.ghost/activitypub/*", isMatch: (url) => url.includes("/.ghost/activitypub/") },
];

function isTrackedUrl(url: string): boolean {
    return ADMIN_API_PATTERN.test(url) || EXTERNAL_URL_BLOCKLIST.some(({ isMatch }) => isMatch(url));
}

/** External boot chrome, served by default like the boot table; override per test with `fakeEndpoint`. */
const DEFAULT_EXTERNAL_RESPONSES: Array<{ method: string; url: string; response: unknown }> = [
    { method: "GET", url: "https://ghost.org/changelog.json", response: { posts: [] } },
];

// Routes listed by the 418 responses: boot entries first, per-test
// registrations appended and trimmed back on reset.
const registeredRoutes: string[] = [];
let bootRouteCount = 0;

export function registerRoute(method: string, path: string | RegExp): void {
    registeredRoutes.push(`${method} ${path}`);
}

let recorded418s: string[] = [];
let unhandledRequestsAllowed = false;

// Snapshot taken by resetFakeApi: the verification runs after the reset has
// trimmed the live route listing.
let routesDuringLastTest: string[] = [];

/** Record a 418-serving request so `verifyNoUnhandledRequests` can fail the test. */
export function record418(description: string): void {
    recorded418s.push(description);
}

/** Per-test opt-out from the fail-on-unhandled-request check; resets after each test. */
export function allowUnhandledRequests(): void {
    unhandledRequestsAllowed = true;
}

/** Throws if any request was served a 418 during the test (unless opted out), then resets the bookkeeping. */
export function verifyNoUnhandledRequests(): void {
    const requests = recorded418s;
    const allowed = unhandledRequestsAllowed;
    recorded418s = [];
    unhandledRequestsAllowed = false;

    if (!allowed && requests.length > 0) {
        const faked = routesDuringLastTest.length > 0 ? routesDuringLastTest : registeredRoutes;

        throw new Error(
            [
                "Request(s) no fake handled (served a 418) during this test:",
                ...requests.map((request) => `  - ${request}`),
                "",
                "Declare admin API requests with a resource fake (fakeTags, fakeMembers, ...) or a renderAdminApp boot override,",
                "external requests with fakeEndpoint(method, url, response),",
                "or call allowUnhandledRequests() at the start of the test to opt out.",
                "",
                "Faked during this test:",
                ...faked.map((route) => `  - ${route}`),
            ].join("\n")
        );
    }
}

// In-flight ledger (requestId → "METHOD path") for requests the worker owns;
// drained in afterEach so stragglers can't cross test boundaries.
const inFlightRequests = new Map<string, string>();

function trackInFlightRequests(worker: SetupWorker): void {
    worker.events.on("request:start", ({ request, requestId }) => {
        if (isTrackedUrl(request.url)) {
            const path = ADMIN_API_PATTERN.test(request.url) ? toAdminApiPath(request.url) : request.url;
            inFlightRequests.set(requestId, `${request.method} ${path}`);
        }
    });
    // msw 2.x emits "request:end" for completed requests but only
    // "unhandledException" when a handler throws — listen to both, or a
    // throwing fake leaks its ledger entry.
    worker.events.on("request:end", ({ requestId }) => {
        inFlightRequests.delete(requestId);
    });
    worker.events.on("unhandledException", ({ requestId }) => {
        inFlightRequests.delete(requestId);
    });
}

export interface SettleRequestsOptions {
    /** How long the ledger must stay continuously empty before resolving. */
    quietMs?: number;
    /** Deadline; throws listing the still-pending requests when exceeded. */
    timeoutMs?: number;
}

const SETTLE_POLL_MS = 10;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/** Resolves once no tracked request has been in flight for `quietMs` continuously. */
export async function settleRequests({ quietMs = 50, timeoutMs = 2000 }: SettleRequestsOptions = {}): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let quietSince: number | undefined;

    while (Date.now() < deadline) {
        if (inFlightRequests.size === 0) {
            quietSince ??= Date.now();
            if (Date.now() - quietSince >= quietMs) {
                return;
            }
        } else {
            quietSince = undefined;
        }
        await sleep(SETTLE_POLL_MS);
    }

    if (inFlightRequests.size === 0) {
        return;
    }

    throw new Error(
        [
            `Request(s) still in flight ${timeoutMs}ms after the test finished:`,
            ...[...inFlightRequests.values()].map((description) => `  - ${description}`),
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
 * Register a runtime admin-API handler; a resolver returning `undefined`
 * falls through to the boot table, then the 418 catch-all.
 */
export function registerAdminApiHandler(resolver: AdminApiResolver): void {
    runningWorker().use(
        http.all(ADMIN_API_PATTERN, async ({ request }) => {
            return await resolver(request, toAdminApiPath(request.url));
        })
    );
}

export interface FakeEndpointOptions {
    status?: number;
}

/**
 * Fake one non-admin-API absolute URL for the current test (wins over the
 * external-origin blocklist, resets between tests). Admin API paths belong
 * to resource fakes / boot overrides / `fakeAdminEndpoint`. Returns a
 * capture of every matched request for payload assertions.
 */
export function fakeEndpoint(method: string, url: string, response: unknown, { status = 200 }: FakeEndpointOptions = {}): EndpointCapture {
    const expectedMethod = method.toUpperCase();
    const requests: CapturedEndpointRequest[] = [];

    runningWorker().use(
        http.all(url, async ({ request }) => {
            if (request.method !== expectedMethod) {
                return undefined;
            }

            let body: unknown;
            try {
                body = await request.clone().json();
            } catch {
                body = undefined;
            }
            requests.push({ url: request.url, body });

            return HttpResponse.json(response as Record<string, unknown>, { status });
        })
    );

    return {
        requests,
        get lastRequest() {
            return requests[requests.length - 1];
        },
    };
}

export interface CapturedEndpointRequest {
    url: string;
    /** Parsed JSON request body, or undefined when there is none. */
    body: unknown;
}

export interface EndpointCapture {
    /** Every matched request, oldest first. */
    requests: CapturedEndpointRequest[];
    readonly lastRequest: CapturedEndpointRequest | undefined;
}

// A named non-`unknown` union: `unknown | fn` collapses to `unknown` and the
// function form's parameter would lose contextual typing.
export type FakeAdminEndpointResponse = object | unknown[] | null | ((request: CapturedEndpointRequest) => unknown);

/**
 * Fake one admin API endpoint that has no resource fake. `apiPath` is
 * relative to /ghost/api/admin (string = exact including the query, RegExp =
 * test). `response` may be a function of the captured request —
 * `({body}) => body` echoes. Returns a capture of every matched request.
 * Prefer `defineResource` for browse endpoints.
 */
export function fakeAdminEndpoint(
    method: string,
    apiPath: string | RegExp,
    response: FakeAdminEndpointResponse,
    { status = 200 }: FakeEndpointOptions = {}
): EndpointCapture {
    const expectedMethod = method.toUpperCase();
    const requests: CapturedEndpointRequest[] = [];

    registerRoute(expectedMethod, apiPath);
    registerAdminApiHandler(async (request, path) => {
        const isMatch = typeof apiPath === "string" ? path === apiPath : apiPath.test(path);
        if (request.method !== expectedMethod || !isMatch) {
            return undefined;
        }

        let body: unknown;
        try {
            body = await request.clone().json();
        } catch {
            body = undefined;
        }

        const captured: CapturedEndpointRequest = { url: request.url, body };
        requests.push(captured);

        const responseBody =
            typeof response === "function" ? (response as (request: CapturedEndpointRequest) => unknown)(captured) : response;

        return HttpResponse.json(responseBody as Record<string, unknown>, { status });
    });

    return {
        requests,
        get lastRequest() {
            return requests[requests.length - 1];
        },
    };
}

export interface StartFakeApiOptions {
    /** The persistent lowest-priority resolver for the shell boot table. */
    resolver: AdminApiResolver;
    /** "METHOD path" descriptions of the boot table, for the 418 route listing. */
    routes: string[];
}

export async function startFakeApi({ resolver, routes }: StartFakeApiOptions): Promise<SetupWorker> {
    if (worker) {
        return worker;
    }

    registeredRoutes.push(...routes, ...DEFAULT_EXTERNAL_RESPONSES.map(({ method, url }) => `${method} ${url}`));
    bootRouteCount = registeredRoutes.length;

    // Initial handlers persist across resetHandlers(); order is priority.
    worker = setupWorker(
        // Shell boot table.
        http.all(ADMIN_API_PATTERN, async ({ request }) => {
            return await resolver(request, toAdminApiPath(request.url));
        }),
        // 418 catch-all for the rest of the admin API.
        http.all(ADMIN_API_PATTERN, ({ request }) => {
            const apiPath = toAdminApiPath(request.url);
            record418(`${request.method} ${apiPath}`);
            return new HttpResponse(
                [
                    "No fake handles this request. If it is needed for the test, declare it with a resource fake (fakeTags, fakeMembers, ...) or a renderAdminApp boot override",
                    "",
                    `Request: ${request.method} ${apiPath}`,
                    "",
                    "Currently faked:",
                    ...registeredRoutes,
                ].join("\n"),
                { status: 418 }
            );
        }),
        // External boot chrome defaults.
        ...DEFAULT_EXTERNAL_RESPONSES.map(({ method, url, response }) =>
            http.all(url, ({ request }) => {
                if (request.method !== method) {
                    return undefined;
                }
                return HttpResponse.json(response as Record<string, unknown>);
            })
        ),
        // 418 catch-alls for the blocklisted external origins.
        ...EXTERNAL_URL_BLOCKLIST.map(({ pattern }) =>
            http.all(pattern, ({ request }) => {
                record418(`${request.method} ${request.url} (external origin)`);
                return new HttpResponse(
                    `No fake handles this external request. Declare it with fakeEndpoint("${request.method}", "${request.url}", ...)`,
                    { status: 418 }
                );
            })
        )
    );

    trackInFlightRequests(worker);

    await worker.start({
        serviceWorker: { url: "/mockServiceWorker.js" },
        onUnhandledRequest: "bypass",
        quiet: true,
    });

    return worker;
}

export function resetFakeApi(): void {
    routesDuringLastTest = [...registeredRoutes];
    worker?.resetHandlers();
    registeredRoutes.length = bootRouteCount;
}
