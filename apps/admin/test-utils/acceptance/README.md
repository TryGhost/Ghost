# Acceptance tier

Full-app tests: the **real admin app** (the same provider stack as `src/main.tsx`) booted in a **real Chromium** instance via Vitest Browser Mode, against a **fake Ghost Admin API** — a simplified working implementation served in-browser through MSW, the same test-double family as e2e's fake-stripe-server and fake-mailgun-server. The shell's boot chrome (settings/config/site/me, sidebar members count, active theme, the ghost.org changelog feed) is handled by default — specs never mention it.

## Anatomy of a spec

Use [`src/tags/tags.acceptance.test.tsx`](../../src/tags/tags.acceptance.test.tsx) as the happy-path template, and [`src/whats-new/whats-new.acceptance.test.tsx`](../../src/whats-new/whats-new.acceptance.test.tsx) as the worked example for the escape hatches (boot override, external feed, non-browse admin endpoint).

- **Given** — declare the world with builders + a resource fake: `fakeTags([tag({name: "News"})])`. A resource fake returns a **capture** — a record of every request it served (`.lastRequest`, `.requests`) — bind it (`const membersApi = fakeMembers(...)`) only when the spec asserts outgoing requests.
- **When** — `await renderAdminApp("/tags")`, then gesture through the screen helper (`tagsScreen.internalTab().click()`).
- **Then** — three assertion idioms, plus one documented fallback:

| Asserting | Idiom |
| --- | --- |
| Element state | `await expect.element(locator).toBeVisible() / toHaveTextContent() / toHaveAttribute()` |
| Element counts | `await expect(locator).toHaveCount(n)` |
| Captured requests | `await expect(membersApi).toHaveSentFilter("label:[VIP]")` / `toHaveSentSearch(...)` — string for an exact match against the decoded param, RegExp for a partial one |
| Edited settings | `await expect(settingsApi).toHaveEditedSettings([{key: "title", value: "New title"}])` — exact settings in the latest `PUT /settings/` payload; order-independent |

The request matchers assert against the **latest** captured request; inspect `capture.requests` for history. For anything they don't cover — other captured fields (`url`, `order`, `page`, `limit`), payload bodies, the current URL — fall back to raw polling:

```ts
await expect.poll(() => membersApi.lastRequest?.limit).toBe(100);
await expect.poll(currentRoute).toBe("/members");   // URL assertions
await expect.poll(() => document.documentElement.classList.contains("dark")).toBe(true);   // DOM state no locator reaches
```

**One render per test.** Each `renderAdminApp` gets a fresh QueryClient and the fake API resets between tests — there is no reload. State that would be persisted on a real server (user preferences, settings) is *represented* by boot overrides; a journey that genuinely needs persistence across reloads belongs in `e2e/`.

**Host page.** `renderAdminApp` mounts into a stand-in of the production host page (the `react-admin` body class + `#root` from index.html), so the shell's viewport-bounded grid applies and scroll-driven behaviors — virtualized lists, infinite paging — work like production.

**What can't port.** UI fed by the Ember state-bridge (`window.EmberBridge` events) is unreachable by network fakes — there is no Ember app in this tier. Examples: nav active states from the routing bridge (`useEmberRouting`), the upgrade banner from `subscriptionChange`. Grep the component's hooks for `ember-bridge` before porting; those behaviors stay in `e2e/`.

## The 418 loop

Don't guess the app's network graph — run the test, the 418 names what's missing. Any request no fake handles is served a 418 (admin API paths *and* known external origins like ghost.org) and fails the test in `afterEach`, listing the request and the currently faked routes. Declare admin API requests with a resource fake or a `renderAdminApp` boot override, external URLs with `fakeEndpoint(method, url, response)`; `allowUnhandledRequests()` opts a single test out.

**Cross-app navigation.** When a spec asserts only the shell's behavior and a navigation mounts another app (settings, ActivityPub), don't fake that app's boot graph: `allowUnhandledRequests()` with a one-line constraint comment ("the settings app owns its request graph") is the sanctioned pattern.

When your area calls a new external origin, add it to `EXTERNAL_URL_BLOCKLIST` in `worker.ts` so a forgotten fake fails the test instead of hitting the real network from CI. `fakeEndpoint` serves JSON bodies only — point fixture image URLs at a non-blocklisted host (they bypass the worker) rather than faking them.

**THE RULE:** fakes never implement NQL — declare the response and assert the outgoing filter string instead (see the doc comment in `resources.ts`).

## The boot table

The shell requests handled by default (`boot.ts`): `browseSettings`, `browseConfig`, `browseSite`, `browseMe`, `browseMembersCount`, `browseActiveTheme`, `editUserPreferences`. A **boot override** replaces the response of one named entry for one test (the entry's method/path stay fixed):

```ts
// Labs flags (sugar for lockstep settings + config overrides):
await renderAdminApp("/tags", {labs: {someFlag: true}});

// Persisted user state, e.g. what's-new preferences:
const me = currentUserResponse();
me.users[0].accessibility = JSON.stringify({whatsNew: {lastSeenDate: "2025-01-01T00:00:00.000Z"}});
await renderAdminApp("/tags", {boot: {browseMe: {response: me}}});
```

Boot responses are STATELESS — a canned reply per request, nothing is stored — with one exception: `editUserPreferences` echoes the PUT's user fields back, because the framework replaces its cached current user with that response (a canned reply would silently wipe every preferences write).

## Faking a resource that has no fake yet

For a **browse endpoint** (`GET /<resource>/`), add a resource fake in `resources.ts` with `defineResource({resource, semantics})` and pick its semantics honestly:

- `{kind: "passthrough"}` — serves exactly the declared entities, never interprets the query. Right for NQL-filtered lists; per-request responses are declared with a function of the parsed query.
- `{kind: "declared-query", covers, select}` — implements *trivial declared* behaviors only (a field match, page/limit slicing); any filter component outside `covers` 418s instead of silently serving the full world.

For a **one-off endpoint** (stats subpaths, settings chrome, a mutation the spec asserts on), use `fakeAdminEndpoint(method, apiPath, response)` — it enters the route listing, returns a capture, and `response` may be a function of the captured request (`({body}) => body` is an honest echo).

## Screen helpers

Per-area locator vocabulary lives in `src/<area>/<area>.screen.ts` (e.g. `membersScreen`): locator factories + multi-step gestures, **no assertions**. Selector strings come from the shared per-area registry modules — flat named constants imported via `@tryghost/test-data/selectors/<area>` (e.g. `import {repliesMetric} from "@tryghost/test-data/selectors/comments"`, or `import * as sel from ...` when a file uses many) — the same strings the e2e page objects use, so both tiers break together when the UI changes. Testid constants are the camelCase of the testid string itself (`"replies-metric"` → `repliesMetric`); accessible-name constants carry their element kind or a `Label` suffix (`newTagLink`, `searchLabel`); bare text fragments end in `Text`. The modules are deliberately not re-exported from the package root — flat names collide across surfaces.

**Row scopes.** A helper that identifies a repeated row returns a *scope*: the row locator itself, augmented with factories for the row's parts — `commentsScreen.threadRow(id).repliedToLink()`. Never write a helper that takes another helper's locator as an argument; scopes keep call sites at one nesting level, reading left-to-right, and the scope is still a locator, so all three assertion idioms work on it unchanged (`await expect.element(commentsScreen.commentRow("…")).toBeVisible()`).

Adding a new screen:

1. Give the component semantic roles/labels; add `data-testid` attributes only where no accessible locator exists.
2. Add a selectors module under `packages/testing/test-data/src/selectors/<area>.ts` — flat named string constants only, no wrapper object, not exported from the package index (the `./selectors/*` subpath serves it).
3. Add `src/<area>/<area>.screen.ts` consuming the registry via the global `page` from `vitest/browser`.
4. Point the e2e page object at the same registry constants (locator code stays Playwright-native).

> **Follow-up:** the registry is the interim single source. The end-state is app-owned selector modules — testids only; accessible names stay product copy, asserted as users see it — consumed by the components AND both test tiers, pending an import surface and an e2e dependency-cost check. Until then, component source remains the source of truth and the registry mirrors it.

## Running

```bash
cd apps/admin
pnpm test:acceptance                               # run once
pnpm test:acceptance:watch                         # watch mode
pnpm test:acceptance:watch -- --browser.headless=false   # headed, watch the browser
```

## Debugging

- **Failure screenshots** land in `__screenshots__/` (gitignored) — the fastest way to see what actually rendered.
- **418 bodies** name the unhandled request and list what is faked.
- There are **no Playwright traces** in this tier — a spec that needs trace-level debugging belongs in `e2e/`.

## Known limitations

- **5xx boot overrides leave a retry ticking.** The framework's fetch layer retries `ServerUnreachableError`/`MaintenanceError` (503)/`TypeError` with 500/1000ms backoff whenever `MODE !== 'development'` — and vitest runs with `MODE === 'test'`, so retries are ACTIVE here. A spec that overrides a boot response with a 503 leaves a pending retry that outlives the teardown quiet window and can fire mid-next-test. Prefer non-retryable 4xx statuses for error-shape specs; proper 5xx-retry semantics need a retry-disable seam in admin-x-framework — tracked as [PLA-242](https://linear.app/ghost/issue/PLA-242).
