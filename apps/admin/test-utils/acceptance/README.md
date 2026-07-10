# Acceptance tier

Full-app tests: the **real admin app** (the same provider stack as `src/main.tsx`) booted in a **real Chromium** instance via Vitest Browser Mode, against a **fake Ghost Admin API** — a simplified working implementation served in-browser through MSW, the same test-double family as e2e's fake-stripe-server and fake-mailgun-server. The shell's boot chrome (settings/config/site/me, sidebar members count, active theme, the ghost.org changelog feed) is handled by default — specs never mention it.

## Anatomy of a spec

Use [`src/tags/tags.acceptance.test.tsx`](../../src/tags/tags.acceptance.test.tsx) as the template:

- **Given** — declare the world with builders + a resource fake: `fakeTags([tag({name: "News"})])`. Bind the returned capture (`const membersApi = fakeMembers(...)`) only when the spec asserts outgoing requests.
- **When** — `await renderAdminApp("/tags")`, then gesture through the screen helper (`tagsScreen.internalTab().click()`).
- **Then** — exactly three assertion idioms:

| Asserting | Idiom |
| --- | --- |
| Element state | `await expect.element(locator).toBeVisible() / toHaveTextContent() / toHaveAttribute()` |
| Element counts | `await expect(locator).toHaveCount(n)` |
| Captured requests | `await expect(membersApi).toHaveSentFilter("label:[VIP]")` / `toHaveSentSearch(...)` — string for an exact match against the decoded param, RegExp for a partial one |

For captured-request fields the matchers don't cover (`url`, `page`, `limit`), fall back to raw polling:

```ts
await expect.poll(() => membersApi.lastRequest?.limit).toBe(100);
```

## The 418 loop

Don't guess the app's network graph — run the test, the 418 names what's missing. Any request no fake handles is served a 418 (admin API paths *and* known external origins like ghost.org) and fails the test in `afterEach`, listing the request and the currently faked routes. Declare admin API requests with a resource fake or a `renderAdminApp` boot override, external URLs with `fakeEndpoint(method, url, response)`; `allowUnhandledRequests()` opts a single test out.

**THE RULE:** fakes never implement NQL — declare the response and assert the outgoing filter string instead (see the doc comment in `resources.ts`).

## Screen helpers

Per-area locator vocabulary lives in `src/<area>/<area>.screen.ts` (e.g. `membersScreen`): locator factories + multi-step gestures, **no assertions**. Selector strings come from the shared registry in `@tryghost/test-data` (`membersSelectors`, `tagsSelectors`) — the same strings the e2e page objects use, so both tiers break together when the UI changes.

> **Follow-up:** the registry is the interim single source. The end-state is app-owned selector modules — testids only; accessible names stay product copy, asserted as users see it — consumed by the components AND both test tiers, pending an import surface and an e2e dependency-cost check. Until then, component source remains the source of truth and the registry mirrors it.

## Running

```bash
pnpm test:acceptance                               # run once
pnpm test:acceptance:watch                         # watch mode
pnpm test:acceptance:watch -- --browser.headless=false   # headed, watch the browser
```

## Debugging

- **Failure screenshots** land in `__screenshots__/` (gitignored) — the fastest way to see what actually rendered.
- **418 bodies** name the unhandled request and list what is faked.
- There are **no Playwright traces** in this tier — a spec that needs trace-level debugging belongs in `e2e/`.
