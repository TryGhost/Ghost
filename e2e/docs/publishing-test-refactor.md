# Publishing E2E Test Refactor Plan

## Problem

The `publishing.test.ts` suite mixes two different concerns:

1. **Admin UI publish flow mechanics** — does the publish modal work?
2. **Frontend access control enforcement** — does the frontend gate content correctly?

The visibility and tier tests drive the entire admin UI (navigate to posts list, create draft, open settings, change dropdown, publish) just to set up a post with a specific visibility. This makes them slow and fragile. The tier visibility test has already required multiple flakiness fixes (`waitForResponse`, reworked `clearVisibilityTiers` using `waitForFunction`) and continues to fail on CI.

## Root Cause

The admin UI for setting visibility is incidental to what these tests actually verify. The real assertion is: **"given a published post with visibility X, does the frontend render the correct access gate?"** That's a backend + theme rendering concern. The admin dropdown interaction adds no unique coverage — it's already tested by the Ember acceptance test suite (`ghost/admin/tests/acceptance/editor/publish-flow-test.js`) and the component test (`gh-psm-visibility-input-test.js`).

## Existing Coverage

| Layer | What's tested | Where |
|-------|--------------|-------|
| Ember component | Visibility dropdown renders 4 options, calls `set()` on change | `gh-psm-visibility-input-test.js` |
| Ember acceptance | Full publish flow modal — types, newsletters, schedule, errors | `publish-flow-test.js` |
| E2E | Publishing + frontend verification | `publishing.test.ts` |

The Ember tests use Mirage (mock server) so they can't verify frontend rendering. The E2E tests use a real Ghost instance so they can. This means the unique value of E2E is verifying the **frontend output**, not re-testing admin UI interactions.

## What Should Change

### Tests that should use the API instead of the admin UI

These tests only need a published post with a specific visibility to exist — they don't need to test the admin flow that creates it:

| Test | Current approach | Proposed approach |
|------|-----------------|-------------------|
| `members-only post shows subscriber gate` | Full admin UI flow via `createPostWithVisibility()` | `postFactory.create({status: 'published', visibility: 'members'})` |
| `paid-members-only post shows paid subscriber gate` | Full admin UI flow via `createPostWithVisibility()` | `postFactory.create({status: 'published', visibility: 'paid'})` |
| `public visibility change keeps post visible on frontend` | Full admin UI flow via `createPostWithVisibility()` | `postFactory.create({status: 'published', visibility: 'public'})` |
| `only allows selected tier members` | Admin UI with `clearVisibilityTiers()` + `selectVisibilityTier()` + `waitForResponse` | `postFactory.create({status: 'published', visibility: 'tiers', tiers: [{id: tierId}]})` |

The Ghost Admin API already accepts `visibility` and `tiers` on the POST/PUT endpoints. The `PostFactory` already supports these fields. The refactored tests would:

1. Create tiers and members via API (already done)
2. Create a published post with the correct visibility via API (replacing admin UI)
3. Assert frontend rendering (unchanged)

### Tests that should stay as full UI flows

These tests verify the **publish interaction itself** — the modal, the flow, the status transitions:

| Test | Why it should stay |
|------|-------------------|
| `publish only - post is visible on frontend` | Validates the core publish pipeline end-to-end |
| `publish and email - post is visible on frontend` | Verifies email integration in publish flow |
| `email only - post is not visible on frontend` | Verifies email-only publish results in 404 |
| `unschedules a scheduled post` | Tests schedule/unschedule lifecycle |
| `updates a published post` | Tests the update/re-publish flow |
| `delete` tests | Tests the delete flow from admin UI |

### Suggested file organization

Consider splitting the tests into two files:

- **`publishing.test.ts`** — Admin UI publish flow tests (the "stay as UI flows" tests above)
- **`post-access.test.ts`** — Frontend access control tests (API-created posts, frontend assertions only)

This makes the separation of concerns explicit in the file structure.

## Impact

- **Eliminates flakiness** from visibility dropdown interactions, tier multi-select, save timing, and `waitForResponse`/`waitForFunction` workarounds
- **Faster test execution** — API calls vs navigating through multiple admin screens
- **Focused assertions** — each test verifies exactly one concern
- **Better failure signals** — when a test fails, the cause is unambiguous (backend access control vs admin UI bug)

## Implementation Notes

The `createPostWithVisibility()` helper (line 49) should be replaced with a simple factory call. For the tier test, the fixture setup (`createTierVisibilityFixture`) is already API-based and can stay as-is — only the post creation and visibility assignment needs to change.

## Known Issue: gh-token-input rendering in editor PSM

During this refactor we discovered that the `gh-token-input` component fails to render when used inside the editor's post settings menu (PSM) in Ember acceptance tests. The error occurs in `basic-dropdown-trigger` → `ensure-safe-component` (from `@embroider/util`), which cannot resolve the string-based `@triggerComponent="gh-token-input/trigger"` in the editor test context.

The same component renders successfully in the bulk-action modal (`edit-posts-access`) tested in `content-test.js`. The root cause appears to be an `ember-basic-dropdown`/`@embroider/util` compatibility issue specific to the editor route's rendering context.

Tier multi-select interaction coverage is provided by `content-test.js` ("can change access with custom tiers"). The Ember editor visibility tests cover the dropdown itself (public/members/paid/tiers switching) and verify saves to the API.

Example refactored tier test:

```typescript
test('only allows selected tier members', async ({page, browser}) => {
    const timestamp = Date.now();
    const title = `gold-tier-post-${timestamp}`;
    const body = 'Only gold members can see this';
    const {allowedTierName, allowedMember, disallowedMember} =
        await createTierVisibilityFixture(page.request, timestamp);

    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({
        title,
        status: 'published',
        visibility: 'tiers',
        tiers: [{id: allowedTier.id}]
    });

    const slug = generateSlug(title);
    const accessMessage = `on the ${allowedTierName} tier only`;

    // Assert: anonymous user sees gate
    const anonymousPage = new PostPage(await page.context().newPage());
    await anonymousPage.gotoPost(slug);
    await expect(anonymousPage.accessCtaHeading).toContainText(accessMessage);

    // Assert: disallowed tier member sees gate
    const baseURL = new URL(page.url()).origin;
    const disallowed = await createAuthenticatedPublicPage(browser, baseURL, disallowedMember);
    await disallowed.postPage.gotoPost(slug);
    await expect(disallowed.postPage.accessCtaHeading).toContainText(accessMessage);

    // Assert: allowed tier member sees content
    const allowed = await createAuthenticatedPublicPage(browser, baseURL, allowedMember);
    await allowed.postPage.gotoPost(slug);
    await expect(allowed.postPage.accessCtaContent).toBeHidden();
    await expect(allowed.postPage.articleBody).toHaveText(body);
});
```
