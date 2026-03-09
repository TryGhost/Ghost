# Ghost Portal Test Coverage — Implementation Plan

> Achieving 100% unit test coverage before the Portal rebuild
>
> Version 1.0 | March 2026 | `apps/portal` • Ghost Monorepo

---

## 1. Executive summary

Ghost Portal is the membership widget embedded via iframe on every Ghost site, handling signup, signin, account management, newsletter preferences, offers, and Stripe checkout. Before a planned full rebuild on React 19 / TypeScript / Zustand, the existing codebase must be locked down with comprehensive automated tests to serve as a behavioral contract: proving that the rebuild reproduces every current behavior.

Portal currently has only 6 test files covering 4 of its approximately 15 page components, 1 utility module (sanitize-html), and no dedicated tests for its largest modules: `data-attributes.js` (the theme integration contract), `api.js` (the API wrapper), `helpers.js` (30+ shared functions), `errors.js`, `notifications.js`, or the 930-line `App` class component. Coverage thresholds are not enforced in CI.

This implementation plan defines a phased approach across 7 sprints to reach 100% statement/branch/function/line coverage for all Portal source files. The plan uses only tooling already present in the Ghost monorepo: Vitest, Testing Library, jsdom, and `@vitest/coverage-v8`. The single new dependency introduced is MSW v2 for API mocking, replacing ad-hoc `vi.fn()` stubs with a shared handler layer that can also be reused in Playwright E2E tests and Storybook during the rebuild.

---

## 2. Verified current state

### 2.1 Confirmed test files on main branch

The following 6 test files and 2 support files have been verified to exist on the current main branch through merged commit diffs and PR status checks.

#### Co-located component tests (`src/components/pages/`)

| File | Origin PR | What it tests |
|------|-----------|---------------|
| `SignupPage.test.js` | PR #22009, #22180 | Captcha rendering, signup form states |
| `SigninPage.test.js` | PR #22009, #22180 | Captcha mock integration, signin flow |
| `MagicLinkPage.test.js` | PR #24755 | OTC input rendering, magic link behavior |

#### Separate test directory (`test/`)

| File | Origin | What it tests |
|------|--------|---------------|
| `test/unit/.../signup-page.test.js` | Commit da858e6 | XSS sanitization of signup terms, member-disabled states |
| `test/unit/.../offer-page.test.js` | Commit da858e6 | XSS sanitization of offer terms (1 test, 45 lines) |
| `test/utils/sanitize-html.test.js` | Commit da858e6 | `sanitizeHtml()` and `validateHexColor()` functions |

#### Test support files

| File | Purpose |
|------|---------|
| `test/utils/test-utils.js` | Custom `render()` wrapper injecting AppContext with overrideContext and mockDoActionFn |
| `src/utils/fixtures-generator.js` | Exports `getSiteData()`, `getProductData()`, `getPriceData()`, `getOfferData()` for realistic mock data |

**Key observation:** Every existing test was added reactively to fix a bug (XSS vulnerability, hCaptcha regression, OTC feature). No proactive, systematic coverage effort has been made.

### 2.2 Test infrastructure

- **Runner:** Vitest with `globals: true` (no explicit imports for `describe`/`test`/`expect`)
- **DOM:** jsdom environment
- **Rendering:** `@testing-library/react` with `@testing-library/jest-dom` v6.9.1
- **Coverage:** `@vitest/coverage-v8` installed, reporters configured (cobertura, text-summary, html)
- **Thresholds:** None configured or enforced
- **API mocking:** Manual `vi.fn()` stubs only. No MSW. A MirageJS migration attempt (PR #24925) was closed without merging.
- **CI:** Portal tests run via Nx as part of the monorepo unit-tests job. No Portal-specific coverage gate exists.

### 2.3 What is NOT tested

Mapping Portal's full source tree against its test inventory reveals massive gaps across every major module category:

| Module category | Files | Current coverage |
|----------------|-------|-----------------|
| Core orchestration | `app.js` (~930 lines), `AppContext.js` | None |
| Theme contract | `data-attributes.js` (~350+ lines) | None |
| API client | `utils/api.js` (fetch wrapper, Stripe, magic links) | None |
| Helper functions | `utils/helpers.js` (30+ exported functions) | None |
| Error handling | `utils/errors.js` (HumanReadableError, chooseBestErrorMessage) | None |
| Notifications | `utils/notifications.js` (query-param parsing, URL cleanup) | None |
| Mode detection | `utils/check-mode.js` (dev/preview/test mode) | None |
| URL rewriting | `utils/transform-portal-anchor-to-relative.js` | None |
| Entrypoint | `src/index.js` (script tag parsing, token stripping) | None |
| Page routing | `pages.js` (getActivePage, isAccountPage, isOfferPage) | None |
| Form validation | `utils/form.js` (ValidateInputForm) | None |
| i18n wrapper | `utils/i18n.js` (Portal namespace binding) | None |
| Page components (11+) | AccountHome, AccountPlan, AccountProfile, Newsletter, Unsubscribe, Recommendations, Support, Loading, etc. | None |
| Shared components | InputField, ActionButton, PlansSection, ProductsSection, PopupModal, TriggerButton, Notification, Frame, Switch, etc. | None |

---

## 3. Tooling decisions

Every tool selected is already used in the Ghost monorepo or is the most widely adopted option in its category. No exotic dependencies are introduced.

| Tool | Version | Role | Rationale |
|------|---------|------|-----------|
| Vitest | Existing | Test runner | Already configured in Portal's `vite.config.js` |
| `@testing-library/react` | Existing | Component rendering | Already installed |
| `@testing-library/jest-dom` | v6.9.1 | DOM assertions | Already installed |
| `@testing-library/user-event` | v14+ | User interaction simulation | Standard RTL companion; more realistic than fireEvent |
| `@vitest/coverage-v8` | Existing | Coverage reporting | Already installed; needs threshold configuration |
| MSW | v2 | API mocking | **New.** Replaces ad-hoc `vi.fn()` stubs. 83M+ npm downloads. Works in Vitest (Node), Playwright (browser), and Storybook. |
| jsdom | Existing | DOM environment | Already configured in Vitest |

### 3.1 Why MSW over `vi.fn()` stubs

- MSW intercepts at the network level, matching real runtime fetch semantics without coupling to implementation details.
- A single set of MSW handlers works across Vitest (Node.js), Playwright (browser), and Storybook, eliminating three separate mock layers.
- Ghost API handlers can be defined once and reused across all Portal tests, with per-test overrides for error states.
- The closed MirageJS PR (#24925) demonstrated the team recognizes the need for structured API mocking. MSW is lighter, more widely adopted, and doesn't require models/factories.

### 3.2 Why NOT other tools

- **MirageJS:** PR #24925 was closed. More complex than needed (ORM, factories, serializers). MSW is simpler and more widely adopted.
- **Cypress:** Cannot interact with cross-origin iframes due to its in-browser architecture. Fundamentally unsuitable for Portal.
- **Storybook + Chromatic:** Valuable for the rebuild, but out of scope for this coverage effort. No visual regression tests needed yet.
- **Jest:** Portal has already migrated to Vitest. No reason to regress.

---

## 4. Phased implementation plan

The plan is organized into 7 phases, each building on the previous. Phases are ordered by risk reduction: pure logic first (highest ROI, lowest complexity), then integration surfaces, then page components. Each phase includes concrete deliverables, estimated effort, and acceptance criteria.

### Phase 0: Infrastructure and foundation (Sprint 1, Week 1)

*Goal: Establish the testing infrastructure so all subsequent phases have a solid foundation.*

#### 0.1 Configure coverage thresholds

Update `vite.config.js` to add Vitest coverage thresholds. Start with a ratchet approach: set thresholds at current coverage levels, then increase them as each phase completes.

- Add `coverage.thresholds` to `vite.config.js` with initial values matching current coverage
- Enable `thresholds.autoUpdate` to ratchet up automatically as coverage improves
- Add per-file 100% threshold for `utils/sanitize-html.js` (already fully tested)
- Configure `coverage.include: ['src/**']` and `coverage.exclude` for test utilities and fixture generators

#### 0.2 Install and configure MSW v2

- Install msw as a devDependency: `yarn add -D msw`
- Create `test/mocks/handlers.js` with Ghost API handlers covering all endpoints Portal calls
- Create `test/mocks/server.js` exporting `setupServer(...handlers)` for Vitest
- Update test setup file to start/stop the MSW server in `beforeAll`/`afterAll`
- Define 5 canonical member state fixtures: anonymous, free, paid, comped, cancelled

#### 0.3 Install `@testing-library/user-event`

- Install: `yarn add -D @testing-library/user-event`
- Update `test-utils.js` to export a `setup()` function wrapping `userEvent.setup()`

#### 0.4 Extend fixture generators

- Extend existing `fixtures-generator.js` with additional scenarios: invite-only site, paid-members-only, missing Stripe config, retention offers, multi-newsletter, suppressed email states
- Create `test/utils/test-fixtures.js` importing and re-exporting all fixtures for convenient test imports

#### 0.5 Add CI coverage enforcement

- Ensure the Portal test target in CI produces coverage reports
- Add a CI step that fails if coverage drops below thresholds
- Add bundle size check for `portal.min.js` (budget: 150KB uncompressed)

**Deliverables:** MSW handlers for all Ghost API endpoints, 5 member state fixtures, coverage thresholds in `vite.config.js`, user-event configured, CI enforcement active.

**Estimated effort:** 3–4 days

---

### Phase 1: Pure utility functions (Sprint 1, Week 2)

*Goal: Test every pure function in `src/utils/`. This is the highest ROI work because these functions are used everywhere and require no DOM or API mocking.*

#### 1.1 `test/utils/helpers.test.js` (NEW)

The `helpers.js` module exports 30+ functions that every page component depends on. Each function should have dedicated test coverage:

- **Currency:** `getCurrencySymbol()` for all supported currencies, edge cases (unknown currency, empty input)
- **Membership checks:** `isPaidMember()`, `isComplimentaryMember()`, `isInviteOnly()`, `isPaidMembersOnly()` with all member state combinations
- **Product logic:** `getSiteProducts()`, `getSitePrices()`, `hasAvailablePrices()`, `hasOnlyFreePlan()`, `hasMultipleProductsFeature()`, `isSameCurrency()`
- **Pricing:** `formatNumber()` for locale-specific formatting, `getProductCadenceFromPrice()`, `getPriceIdFromPageQuery()`
- **Feature flags:** `hasMultipleNewsletters()`, `hasFreeTrialTier()`, `freeHasBenefitsOrDescription()`
- **Signup/signin gates:** `isSignupAllowed()`, `isSigninAllowed()`, `isFreeSignupAllowed()`
- **URL helpers:** `removePortalLinkFromUrl()`, `getSiteDomain()`, `getFirstpromoterId()`
- **Offer logic:** `isActiveOffer()` with all offer states (active, expired, archived, redeemed)
- **Misc:** `isRecentMember()`, `isSentryEventAllowed()`, `createPopupNotification()`, `hasRecommendations()`

#### 1.2 `test/utils/errors.test.js` (NEW)

- `HumanReadableError.fromApiResponse()` for: 400 JSON error, 429 rate limit, 500 server error, invalid JSON body, non-handled status codes
- `chooseBestErrorMessage()` for: special-message detection with `{number}` substitution, default-message precedence, fallback to `.toString()`

#### 1.3 `test/utils/notifications.test.js` (NEW)

- `NotificationParser` for: Stripe checkout success, billing-only success, auth action + success query params, unknown action params
- `clearURLParams()`: builds correct query string, calls `history.replaceState` correctly, no-op when no params to clear

#### 1.4 `test/utils/check-mode.test.js` (NEW)

- Normal preview mode detection via hash
- Offer preview mode detection via hash + query params
- Dev mode: when `customSiteUrl` exists and `NODE_ENV` is `development`
- Test mode detection
- Default (none) mode when no indicators present

#### 1.5 `test/utils/transform-portal-anchor-to-relative.test.js` (NEW)

- Ignores non-portal links (regular anchor tags)
- Ignores already-relative links (`#/portal/...`)
- Ignores external-origin links
- Converts same-origin absolute portal links to hash-only format

#### 1.6 `test/utils/get-own.test.js` (NEW if not present)

- Returns own property value when present
- Returns undefined for inherited properties
- Returns undefined for non-existent properties

#### 1.7 `test/utils/form.test.js` (NEW)

- `ValidateInputForm`: email validation rules, required field validation, error message generation

**Deliverables:** 7 new test files covering all pure utility modules. Expected coverage unlock: approximately 25–35% of total source lines.

**Estimated effort:** 4–5 days

---

### Phase 2: Page routing and navigation (Sprint 2, Week 1)

*Goal: Lock down the navigation contract that determines which page renders for any given state.*

#### 2.1 `test/pages.test.js` (NEW)

- `getActivePage()` returns correct component for all valid page keys (`signin`, `signup`, `accountPlan`, `accountProfile`, `accountHome`, `offer`, `supportError`, etc.)
- `getActivePage()` falls back to `signup` for unknown/invalid page keys
- `isAccountPage()` correctly identifies all account-prefixed pages and rejects non-account pages
- `isOfferPage()` correctly identifies offer page key
- `isSupportPage()` correctly identifies support and supportError pages
- Page registry contract test: assert all entries in `Pages` map resolve to non-null components (catches orphaned pages after refactors)

#### 2.2 `test/index.test.js` (NEW)

- Script tag parsing: `data-ghost`, `data-api`, `data-key`, `data-i18n`, `data-locale` all parsed correctly
- `data-i18n='true'` yields boolean `siteI18nEnabled`
- Missing script tag returns safe defaults (empty object)
- Root div (`#ghost-portal-root`) is inserted into document body
- Token query param stripping: removes `token`, calls `history.replaceState`, no-op when absent

#### 2.3 Expand `test/app.test.js` (EXTEND or NEW)

- Portal link transformation to relative (`#/portal/...`) on render
- i18n language selection: locale preference, site locale fallback, direction (RTL) detection
- `getPageFromLinkPath()` mapping for all supported paths including offers, custom product pricing, support, newsletter FAQ deep links
- `fetchOfferQueryStrData` parsing for retention offer preview

**Deliverables:** 3 test files covering all routing, navigation, and boot behavior.

**Estimated effort:** 3–4 days

---

### Phase 3: API client (Sprint 2, Week 2)

*Goal: Validate every fetch call Portal makes. This uses MSW to intercept network requests and assert correct endpoints, methods, headers, and payloads.*

#### 3.1 `test/utils/api.test.js` (NEW)

The `api.js` module (created via `setupGhostApi()`) is Portal's entire network layer. Test every method:

**Members endpoints:**

- `member.sessionData()`: correct GET to `/members/api/member/`, `credentials: same-origin`
- `member.update()`: correct PUT with JSON body
- `member.getIntegrityToken()`: correct GET, error mapping via `HumanReadableError` for 400/429/500
- `member.sendMagicLink()`: POST with `urlHistory` if present, returns `{}` on non-JSON OK response, throws `HumanReadableError` on failure
- `member.verifyOTC()`: success returns JSON, failure throws mapped error or default message

**Content endpoints:**

- Only fire when both `apiUrl` and `apiKey` exist
- Correct URL construction with `?key=...` parameter
- Tiers, newsletters, settings, offers, recommendations each hit correct paths

**Stripe integration:**

- `checkoutPlan`: session creation, metadata shape, default cancel URL, redirect behavior (with and without `responseBody.url`)
- `checkoutDonation`: correct request shape and Stripe redirect
- `editBilling` / `manageBilling`: correct endpoint and redirect

**Other:**

- Recommendation beacon: stub `navigator.sendBeacon`, verify click/subscribed events
- Feedback submission: correct POST body

**Deliverables:** 1 comprehensive test file with approximately 40–60 test cases covering the entire API surface.

**Estimated effort:** 4–5 days

---

### Phase 4: Data attributes — the theme contract (Sprint 3)

*Goal: This is the single largest coverage unlock. `data-attributes.js` is the compatibility layer for all non-Portal UI usage: custom forms, plan buttons, billing links, signout, cancel/continue subscription. It is the most common integration surface for theme developers.*

#### 4.1 `test/data-attributes.test.js` (NEW)

Build DOM fragments in jsdom, call `handleDataAttributes()`, then assert correct fetch calls (via MSW) and DOM mutations:

**`formSubmitHandler`:**

- Builds `reqBody` correctly from: email, trimmed name, `data-members-label`, newsletter selection inputs (hidden/checkbox/radio), the "none checked" edge case that forces `newsletters: []`
- Respects `data-members-autoredirect` and `data-members-form` emailType semantics
- OTC path: `data-members-form='signin'` + `data-members-otc='true'` extracts `otc_ref`, calls `doAction('startSigninOTCFromCustomForm')`
- Integrity token then magic-link sequencing: GET integrity token, POST send-magic-link with merged payload
- Success: sets correct DOM classes (`success`, removes `loading`), re-attaches submit handler
- Failure (non-OK API): uses `HumanReadableError` + `chooseBestErrorMessage`, sets `.error` class
- Failure (network): falls back to generic error message, sets `.error` class

**`planClickHandler`:**

- Resolves `data-members-plan` to checkout session, correct endpoint call sequence
- Handles `data-members-success` / `data-members-cancel` URL computation (absolute and relative)
- Failure: resets loading class, restores click handler, displays error text

**Billing and signout handlers:**

- `data-members-edit-billing`: correct endpoint, redirect behavior
- `data-members-manage-billing`: correct endpoint, redirect behavior
- `data-members-signout`: correct endpoint call and class toggling
- All: error class toggling and handler reattachment on failure

**Subscription cancel/continue:**

- `data-members-cancel-subscription` with retention offers: routes into Portal UI instead of calling cancel endpoint
- `data-members-cancel-subscription` without retention offers: performs cancellation PUT, handles failure
- `data-members-continue-subscription`: performs continue PUT, handles failure

**Deliverables:** 1 large test file with approximately 50–70 test cases covering the entire theme integration contract.

**Estimated effort:** 5–7 days (largest single phase)

---

### Phase 5: Action handler and state management (Sprint 4, Week 1)

*Goal: Test the ActionHandler dispatch system that manages all state transitions in response to user actions.*

#### 5.1 `test/actions.test.js` (NEW or EXTEND)

Enumerate all supported action keys from ActionHandler usage across the codebase, then test each:

- **signup:** correct API call, state transitions (loading, success, error), name trimming
- **signin:** correct magic link send, OTC flow branching
- **signout:** correct API call, state reset
- **updateProfile:** name trimming, correct PUT call, optimistic state update
- **updateNewsletter:** correct payload shape for newsletter preference changes
- **openPopup / closePopup:** UI state transitions
- **switchPage:** navigation state updates, valid/invalid page handling
- **checkoutPlan:** Stripe session creation, redirect
- **updateSubscription:** plan change flow
- **cancelSubscription:** with and without retention offers
- **continueSubscription:** reactivation flow
- **editBilling / manageBilling:** Stripe Customer Portal redirect
- **startSigninOTCFromCustomForm:** state setup with email, `otc_ref`, inbox links
- **verifyOTC:** success redirect, error extraction, failure fallbacks

For each action, test: success path state updates, error/exception path state updates, correct API method calls and request payloads, and any timeout/delayed-action resets.

**Deliverables:** 1 comprehensive test file covering all action dispatch paths.

**Estimated effort:** 4–5 days

---

### Phase 6: Page and shared component smoke tests (Sprint 4–5)

*Goal: Ensure every page component renders without crashing for all relevant member states and site configurations, and that key UI elements and actions are wired correctly.*

#### 6.1 Strategy for page tests

Portal pages are class components using `this.context`. The existing `test-utils.js` render wrapper injects AppContext, making it possible to test each page in isolation without the full App component.

For each page, test three categories:

- **Smoke rendering:** renders without error for all 5 member states (anonymous, free, paid, comped, cancelled)
- **Conditional rendering:** correct elements shown/hidden based on site configuration (invite-only, paid-members-only, Stripe configured, multi-newsletter, free trial tier)
- **User interactions:** correct `doAction()` calls when user clicks primary CTAs

#### 6.2 Page test inventory

| Page | Test file | Key test scenarios |
|------|-----------|-------------------|
| AccountHomePage | `test/pages/account-home.test.js` | Avatar display, subscription status, action buttons per member state |
| AccountPlanPage | `test/pages/account-plan.test.js` | Plan list rendering, upgrade/downgrade actions, Stripe integration |
| AccountProfilePage | `test/pages/account-profile.test.js` | Form pre-fill, name/email update actions, validation |
| AccountEmailPage | `test/pages/account-email.test.js` | Email preference toggles, save action |
| NewsletterSelectionPage | `test/pages/newsletter-selection.test.js` | Multi-newsletter rendering, subscribe/unsubscribe toggles |
| UnsubscribePage | `test/pages/unsubscribe.test.js` | Unsubscribe confirmation, re-subscribe option |
| RecommendationsPage | `test/pages/recommendations.test.js` | Recommendation list rendering, click tracking |
| SupportPage | `test/pages/support.test.js` | Support flow rendering, error states |
| LoadingPage | `test/pages/loading.test.js` | Loading indicator renders |

#### 6.3 Shared component test inventory

| Component | Test file | Key test scenarios |
|-----------|-----------|-------------------|
| InputField | `test/components/input-field.test.js` | Renders with label, handles onChange, shows error state |
| ActionButton | `test/components/action-button.test.js` | Renders label, loading state, disabled state, onClick |
| PlansSection | `test/components/plans-section.test.js` | Renders plans from products, highlights current plan |
| ProductsSection | `test/components/products-section.test.js` | Renders products with prices, currency formatting |
| PopupModal | `test/components/popup-modal.test.js` | Opens/closes, renders child page, handles close action |
| TriggerButton | `test/components/trigger-button.test.js` | Renders, responds to click, applies portal-open/close classes |
| Notification | `test/components/notification.test.js` | Shows notification text, auto-dismiss, different notification types |
| Switch | `test/components/switch.test.js` | Toggle on/off, controlled state |

**Deliverables:** 17+ new test files covering all page and shared components.

**Estimated effort:** 7–10 days

---

### Phase 7: Coverage ratchet to 100% and lockdown (Sprint 6)

*Goal: Close remaining gaps identified by coverage reports, enforce 100% thresholds, and finalize documentation.*

#### 7.1 Coverage gap analysis

- Run `vitest --coverage` and analyze the HTML report to identify uncovered lines/branches
- Focus on: edge cases in conditional rendering, error paths, rarely-hit branches in `helpers.js`
- Add targeted tests for each gap identified

#### 7.2 Enforce 100% thresholds

Update `vite.config.js` coverage thresholds to:

- `statements: 100`
- `branches: 100`
- `functions: 100`
- `lines: 100`
- Remove `autoUpdate` (thresholds are now at ceiling)

#### 7.3 Documentation

- Add a "Testing" section to Portal's README covering: how to run tests locally, how to run coverage, how to interpret the HTML coverage report, how to add new tests following existing patterns, fixture extension guide
- Add inline JSDoc comments to `test-utils.js` and `fixtures-generator.js` explaining the helper API
- Document the MSW handler architecture for future contributors

#### 7.4 CI finalization

- Verify coverage thresholds block PRs that reduce coverage
- Add coverage report as a CI artifact for easy debugging
- Verify the full test suite runs in under 60 seconds

**Deliverables:** 100% coverage enforced in CI, full documentation, clean coverage report.

**Estimated effort:** 3–4 days

---

## 5. Timeline summary

| Phase | Sprint | Scope | Effort | Coverage delta |
|-------|--------|-------|--------|---------------|
| 0: Infrastructure | Sprint 1, Wk 1 | MSW, fixtures, thresholds, CI | 3–4 days | Baseline established |
| 1: Pure utilities | Sprint 1, Wk 2 | 7 new test files for all `utils/` | 4–5 days | +25–35% |
| 2: Routing + boot | Sprint 2, Wk 1 | `pages.js`, `index.js`, `app.js` navigation | 3–4 days | +5–10% |
| 3: API client | Sprint 2, Wk 2 | `api.js` full endpoint coverage | 4–5 days | +10–15% |
| 4: Data attributes | Sprint 3 | Theme contract (`data-attributes.js`) | 5–7 days | +15–20% |
| 5: Actions | Sprint 4, Wk 1 | ActionHandler full dispatch coverage | 4–5 days | +5–10% |
| 6: Pages + components | Sprint 4–5 | 17+ page/component test files | 7–10 days | +10–15% |
| 7: Lockdown | Sprint 6 | Gap closure, 100% enforcement, docs | 3–4 days | → 100% |

**Total estimated effort:** 33–48 working days (7–10 weeks with one developer, or 4–6 weeks with two developers working in parallel on different phases).

---

## 6. Recommended test file structure

Consolidate all tests under the `test/` directory with a structure that mirrors `src/`:

```
apps/portal/
  test/
    setup-tests.js                # Vitest setup (MSW server, jest-dom, cross-fetch)
    mocks/
      handlers.js                 # MSW request handlers for Ghost API
      server.js                   # MSW setupServer export
    utils/
      test-utils.js               # Custom render wrapper (existing)
      test-fixtures.js            # Re-exports from fixtures-generator (existing)
      helpers.test.js             # Phase 1
      errors.test.js              # Phase 1
      notifications.test.js       # Phase 1
      check-mode.test.js          # Phase 1
      transform-anchor.test.js    # Phase 1
      form.test.js                # Phase 1
      api.test.js                 # Phase 3
      sanitize-html.test.js       # Existing
    app.test.js                   # Phase 2
    pages.test.js                 # Phase 2
    index.test.js                 # Phase 2
    data-attributes.test.js       # Phase 4
    actions.test.js               # Phase 5
    pages/                        # Phase 6
      account-home.test.js
      account-plan.test.js
      account-profile.test.js
      account-email.test.js
      newsletter-selection.test.js
      unsubscribe.test.js
      recommendations.test.js
      support.test.js
      loading.test.js
    components/                   # Phase 6
      input-field.test.js
      action-button.test.js
      plans-section.test.js
      products-section.test.js
      popup-modal.test.js
      trigger-button.test.js
      notification.test.js
      switch.test.js
    unit/components/pages/        # Existing (XSS tests)
      signup-page.test.js
      offer-page.test.js
```

---

## 7. MSW handler architecture

The MSW handler layer is the most important infrastructure deliverable because it enables all subsequent test phases and will be reusable during the rebuild.

### 7.1 Ghost API handlers (`test/mocks/handlers.js`)

Default handlers return success responses with realistic fixture data. Each handler has a corresponding override helper for error testing:

| Endpoint | Default behavior | Error overrides needed |
|----------|-----------------|----------------------|
| `GET /members/api/member/` | Returns paid member fixture | 401 unauthorized, 500 server error |
| `PUT /members/api/member/` | Returns updated member | 400 validation error, 500 server error |
| `GET /members/api/member/integrity-token` | Returns valid token | 400, 429 rate limit, 500 |
| `POST /members/api/send-magic-link/` | Returns 200 OK | 400, 429, non-JSON response |
| `POST /members/api/verify-otp` | Returns session JSON | 400 invalid code, 500 |
| `GET /ghost/api/content/tiers/` | Returns 2 tiers + free | Empty tiers, 500 |
| `GET /ghost/api/content/newsletters/` | Returns 2 newsletters | Empty newsletters |
| `GET /ghost/api/content/settings/` | Returns site settings | 500 |
| `GET /ghost/api/content/offers/` | Returns 1 active offer | Empty offers |
| `POST /members/api/session` | Returns 200 | 401 |
| `POST /members/api/create-stripe-checkout-session` | Returns checkout URL | 400, 500 |
| `DELETE /members/api/session` | Returns 200 | 500 |

### 7.2 Per-test override pattern

MSW v2 supports runtime handler overrides via `server.use()`, which reset after each test via `afterEach(() => server.resetHandlers())`. This enables error testing without polluting the global handler set:

```javascript
// In a test file:
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('shows error on magic link failure', async () => {
  server.use(
    http.post('*/members/api/send-magic-link/', () =>
      HttpResponse.json(
        { errors: [{ message: 'Rate limited' }] },
        { status: 429 }
      )
    )
  );
  // ... render and assert
});
```

---

## 8. Acceptance criteria

1. `vitest --coverage` produces an HTML report showing 100% statements, branches, functions, and lines for all files in `src/`
2. Coverage thresholds are enforced in `vite.config.js` and fail the CI build when not met
3. All tests pass locally via `yarn test` and in CI via Nx-orchestrated test target
4. No test requires a live Ghost instance, live Stripe account, or real network access
5. MSW handlers cover every Ghost API endpoint Portal calls, with documented per-test override patterns
6. Five canonical member state fixtures (anonymous, free, paid, comped, cancelled) cover all conditional rendering paths
7. Every page component has at minimum a smoke test for all 5 member states
8. `data-attributes.js` has dedicated integration tests covering all DOM event handlers and class mutations
9. `api.js` has dedicated tests for every method including error paths
10. `helpers.js` has dedicated tests for every exported function
11. Portal README includes a Testing section with contributor guidance
12. The full test suite completes in under 60 seconds
13. No new dependencies are introduced beyond MSW v2 and `@testing-library/user-event`

---

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Class components resist testing | **High** — class components using `this.context` are harder to test in isolation than functional components with hooks | Leverage the existing `test-utils.js` AppContext wrapper. Test behavior (rendered output, action dispatches) not internal state. |
| `data-attributes.js` is tightly coupled to DOM | **Medium** — jsdom may not perfectly replicate browser behavior for form submissions and class toggling | Build real DOM fragments in jsdom. Use user-event for realistic interactions. Validate critical paths additionally in Playwright E2E. |
| 930-line `App.js` monolith | **Medium** — testing the entire App class at unit level may be impractical | Test `App.js` through its public API: rendered output for different states, action dispatch behavior, and integration tests that mount App with MSW-mocked API. |
| MSW adds a new dependency | **Low** — team may resist adding a new devDependency | MSW is the most widely adopted API mocking library (83M+ npm downloads). It's already the standard recommendation for React Testing Library. The investment pays forward into the rebuild. |
| Coverage ratchet may slow feature development | **Low** — developers touching Portal must maintain coverage | Use `autoUpdate` for the ratchet phase. Feature PRs only need to maintain the threshold, not increase it. The threshold only goes up when test PRs land. |
| Existing co-located tests (`src/`) conflict with `test/` convention | **Low** — two test locations create confusion | Leave existing co-located tests in place (they work). New tests go in `test/`. Document both locations in README. |

---

## 10. Success metrics

| Metric | Current | Target | Measured by |
|--------|---------|--------|-------------|
| Statement coverage | < 15% (estimated) | 100% | `vitest --coverage` |
| Branch coverage | < 10% (estimated) | 100% | `vitest --coverage` |
| Function coverage | < 15% (estimated) | 100% | `vitest --coverage` |
| Line coverage | < 15% (estimated) | 100% | `vitest --coverage` |
| Test file count | 6 | 35+ | `find test/ -name '*.test.*' \| wc -l` |
| Test execution time | < 5s | < 60s | `vitest --reporter=verbose` |
| CI coverage gate | None | Enforced | CI pipeline configuration |
| New dependencies | 0 | 2 (MSW + user-event) | `package.json` diff |

When all metrics are met, the test suite serves as the definitive behavioral contract for the Portal rebuild. Any rebuilt component must pass the same tests (adapted for the new API surface) to confirm feature parity.
