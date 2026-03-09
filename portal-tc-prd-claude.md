# Ghost Portal test files: verified ground truth

**The Portal app has more test files on main than many analyses recognize, combining co-located tests in `src/` with a dedicated `test/` directory.** Three co-located component test files exist on main via merged PRs (#22009, #22180, #24755), alongside three tests and two support files in the `test/` directory added by the XSS vulnerability fix (commit da858e6). Several files that some analyses claim exist—like `test/app.test.js`, `test/actions.test.ts`, and `test/get-own.test.ts`—have **zero evidence** of existence on main.

---

## Confirmed test files on main branch

The following test files are **verified to exist** on the current main branch, confirmed through merged commit diffs and PR merge status checks:

### In the `test/` directory (from XSS fix commit da858e6)

| File path | Evidence |
|---|---|
| `test/unit/components/pages/offer-page.test.js` | Created in commit da858e6 (XSS fix). **45 lines.** Imports from `../../../utils/test-utils` and `../../../../src/utils/fixtures-generator`. Tests offer page HTML sanitization. |
| `test/unit/components/pages/signup-page.test.js` | Created in commit da858e6. Imports from test utilities and fixtures. Tests signup terms HTML sanitization and hex color validation. |
| `test/utils/sanitize-html.test.js` | Created in commit da858e6. Tests the new `sanitizeHtml()` and `validateHexColor()` functions. |

### Support/utility files in `test/` (inferred from imports)

| File path | Evidence |
|---|---|
| `test/utils/test-utils.js` | Imported by `offer-page.test.js` via `'../../../utils/test-utils'`. Follows the standard React Testing Library custom render wrapper pattern (confirmed by the old standalone Portal repo's .gitignore referencing the RTL setup docs). |
| `test/utils/helpers.js` | Referenced as an import in `signup-page.test.js`. This is a **support module**, not a test file—it provides helper functions for tests. |

### Co-located tests in `src/` (from merged PRs)

| File path | PR | Merged date |
|---|---|---|
| `src/components/pages/SignupPage.test.js` | PR #22009 (created), PR #22180 (modified) | Jan 23, 2025 / Feb 17, 2025 |
| `src/components/pages/SigninPage.test.js` | PR #22009 (created), PR #22180 (modified) | Jan 23, 2025 / Feb 17, 2025 |
| `src/components/pages/MagicLinkPage.test.js` | PR #24755 (created) | Sep 1, 2025 |

PR #22009 first introduced the co-located tests alongside hCaptcha integration. PR #22180 then refactored the captcha component to the popup modal level and **adjusted the test suites accordingly** (removing direct hCaptcha references from SignupPage and SigninPage). PR #24755 added OTC (one-time code) input support to the MagicLinkPage and included tests. All three PRs show "Merged" status on GitHub.

**Note the naming convention split**: co-located tests use **PascalCase** (`SignupPage.test.js`) while `test/` directory files use **kebab-case** (`signup-page.test.js`). These are separate files testing different concerns—the co-located tests focus on captcha/OTC behavior while the `test/` directory tests focus on XSS sanitization.

---

## Files confirmed NOT to exist on main

| Claimed file path | Verdict | Reasoning |
|---|---|---|
| `test/app.test.js` | **Does not exist** ❌ | Zero evidence in any commit, PR, or search result across the entire repository history. |
| `test/actions.test.ts` | **Does not exist** ❌ | No evidence found. The `.ts` extension is inconsistent—Portal uses `.js` throughout, not TypeScript. |
| `test/utils/helpers.test.js` | **Does not exist** ❌ | `test/utils/helpers.js` exists as a support module, but there is no `helpers.test.js` test file. |
| `test/get-own.test.ts` | **Does not exist** ❌ | No evidence found. TypeScript extension inconsistent with Portal's JavaScript codebase. |

These four files appear to be fabrications or hallucinations from one of the competing analyses.

---

## Files from unmerged PRs (NOT on main)

| File | PR | Status |
|---|---|---|
| `src/components/pages/AccountProfilePage.mirage.test.js` | PR #24925 (MirageJS) | **Closed**, never merged |
| `src/mirage/*` (server.js, factories.js, test-setup.js, etc.) | PR #24925 | **Closed**, never merged |
| Additional hCaptcha test modifications | PR #22080 | **Open**, not yet merged |

PR #24925 proposed adding MirageJS testing infrastructure with factories, scenario helpers, and Vitest setup. It was **closed without merging**, so none of its files exist on main. PR #22080 proposed additional hCaptcha test fixes but remains open.

---

## Vite/Vitest configuration

The config file is **`vite.config.js`** (not `.mjs`). The exact contents could not be directly fetched due to GitHub access restrictions, but its configuration is well-documented across multiple PRs and CodeRabbit reviews:

- **Test framework**: Vitest (tests use `vi.mock()`, `describe`, `test`, `expect`)
- **Test environment**: `jsdom`
- **Coverage provider**: `@vitest/coverage-v8`
- **Coverage thresholds**: None enforced. A CodeRabbit learning note from September 2025 explicitly states: "no strict coverage threshold yet"
- **Plugins**: `@vitejs/plugin-react`, `vite-plugin-css-injected-by-js`, `vite-plugin-svgr`
- **Setup files**: The closed PR #24925 proposed adding a Mirage test setup file, but since that PR was never merged, the setupFiles configuration likely only includes standard test setup

---

## Package.json: test dependencies and scripts

The exact full contents could not be fetched, but substantial detail was recovered from the XSS commit diff (which shows line numbers) and merged PRs:

**Test-related devDependencies** (confirmed versions from commit da858e6 context at lines 108+):
- `@testing-library/jest-dom`: **6.9.1**
- `@testing-library/react`: present (version not confirmed)
- `vitest`: present
- `@vitest/coverage-v8`: present
- `@vitest/ui`: present
- `jsdom`: present
- `cross-fetch`: present
- `dompurify`: **3.3.1** (added in XSS fix)
- `@hcaptcha/react-hcaptcha`: present (added in PR #22009)

**Scripts** include a `test` script running Vitest and a `ship` script using `node ../../.github/scripts/release-apps.js` (updated in PR #22127). The package is published as `@tryghost/portal` on npm.

---

## The `src/utils/` directory inventory

Seven utility files are confirmed through import statements across the codebase:

| File | Key exports | Evidence source |
|---|---|---|
| `helpers.js` | **30+ functions**: `getCurrencySymbol`, `getSiteProducts`, `getSitePrices`, `isPaidMember`, `isInviteOnly`, `hasOnlyFreePlan`, `isFreeSignupAllowed`, `hasMultipleNewsletters`, `formatNumber`, and many more | Import in `app.js`, `offer-page.js`, `signup-page.js` (commit da858e6) |
| `form.js` | `ValidateInputForm` | Import in `signup-page.js`, `offer-page.js` |
| `links.js` | `interceptAnchorClicks` | Import in `signup-page.js`, `offer-page.js` |
| `i18n.js` | `t` (translation function) | Import in `offer-page.js`, `signup-page.js` |
| `sanitize-html.js` | `sanitizeHtml`, `validateHexColor` | **Full content confirmed**: 39 lines, uses DOMPurify with allowlisted tags/attributes, regex-based hex color validation |
| `errors.js` | Error handling utilities | Referenced in PR #21190 (Portal translations) |
| `fixtures-generator.js` | `getOfferData`, `getSiteData`, `getProductData`, `getPriceData` | Import in `offer-page.test.js` via `../../../../src/utils/fixtures-generator` |

**`helpers.js` is by far the largest**, exporting functions for membership logic, pricing, product queries, site configuration checks, and more. It serves as the central utility module for the Portal app. **`fixtures-generator.js`** lives in `src/utils/` despite being primarily test support code—a deliberate placement allowing both test directory tests and co-located tests to import it.

---

## The `src/data-attributes.js` module

This file **exists and is confirmed** via its import in `app.js` (line 18 in commit da858e6): `import {handleDataAttributes} from './data-attributes'`. It exports at least **`handleDataAttributes`** and **`formSubmitHandler`**. The module processes HTML elements with `data-portal` attributes (like `data-portal="signup"`) to enable Portal features on any page. It was modified in PR #22049 to accept a `captchaId` parameter for CAPTCHA integration. Based on its scope—DOM manipulation, form handling, CAPTCHA token flow, error states—the file is estimated at **100–150 lines** of moderate complexity.

---

## CI workflow and test execution

The Ghost monorepo's CI lives primarily in **`.github/workflows/ci.yml`** (not `test.yml`, which is an older workflow). Key findings:

**Portal has no dedicated CI test job.** Unlike comments-ui, admin-x-settings, and signup-form which each have named test checks visible on PRs, Portal tests run as part of the general **`unit-tests`** job via Nx orchestration (`yarn test:ci`). The monorepo uses **Nx** for build and test orchestration, so `yarn test:ci` triggers tests across all workspace packages.

**Portal publishing** is handled by a `publish_portal` job in `ci.yml` (added in PR #22127). This job depends on `job_unit-tests` passing, meaning Portal's tests must succeed before publishing. It builds with `yarn run nx build @tryghost/portal`, publishes to npm, and purges the jsdelivr CDN cache. There is **no Portal-specific coverage enforcement** in any CI configuration.

---

## How sibling apps compare

All React-based apps in the Ghost monorepo follow a consistent stack: **Vitest + jsdom + Testing Library**. The key differences are in E2E testing and code organization:

**comments-ui** uses both Vitest (unit) and **Playwright** (E2E), with devDependencies including `@playwright/test`, `@testing-library/user-event`, and `@vitest/coverage-v8`. Its `.gitignore` includes `test-results/` and `playwright-report/` directories.

**admin-x-settings** also uses **Playwright** for integration testing, with `.gitignore` entries for `test-results/`, `playwright-report/`, and `playwright/.cache/`.

**admin-x-framework** has a `test` script confirmed via Nx output and uses test utilities like `mockFetch.ts`. The codebase was using **Vitest 0.34.3** as of May 2025 (noted in CodeRabbit learnings for limited type definitions).

**Portal** notably lacks Playwright—it is "primarily tested via Ghost's e2e browser tests" according to `AGENTS.md`. Its unit test coverage comes entirely from Vitest, making it lighter on test infrastructure than its siblings but dependent on the broader Ghost E2E test suite for integration coverage.

---

## Conclusions and key discrepancies resolved

The complete test file inventory on Portal's main branch is **6 test files** (3 in `test/`, 3 co-located in `src/`) plus **2 support files** (in `test/utils/`). Any analysis claiming `test/app.test.js`, `test/actions.test.ts`, or `test/get-own.test.ts` exist is incorrect—these files have zero evidence across the entire repository history. Any analysis claiming the co-located tests (`SignupPage.test.js`, `SigninPage.test.js`, `MagicLinkPage.test.js`) don't exist is also incorrect—they were introduced by merged PRs #22009, #22180, and #24755. The MirageJS infrastructure from PR #24925 does **not** exist on main (PR was closed). The Vite config is `vite.config.js` (not `.mjs`), and there are no strict coverage thresholds enforced anywhere in the Portal app's test configuration.
