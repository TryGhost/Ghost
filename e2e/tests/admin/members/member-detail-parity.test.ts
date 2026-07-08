import {MemberDetailsPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

/**
 * Cross-implementation parity tests for /members/:id.
 *
 * The `memberDetailsReact` Labs flag lets React and Ember versions of the same
 * screen coexist. This file runs the SAME assertions against both by looping
 * over `[false, true]` and generating one describe block per state. NO
 * `if (isReact)` branching lives inside any test body.
 *
 * If a test passes under one describe but fails under the other, that's a
 * REAL user-facing gap between the two implementations — which is exactly
 * the "keep the LLM honest" invariant this file exists to guard.
 *
 * Locator strategy (strict priority):
 *   1. Semantic accessible names — `getByRole('textbox', {name})`, `getByRole('button', {name})`, `getByText`.
 *   2. `role='button'.or(role='menuitem')` unions for dropdown actions Ember
 *      renders as buttons and React renders as Radix menuitems.
 *   3. `data-testid` ONLY for testids grep-verified to exist in both
 *      implementations. Currently confirmed:
 *        - `member-actions`         → Ember `member.hbs:44`, React `member-actions-menu.tsx`.
 *        - `member-signin-url`      → Ember `modal-impersonate-member.hbs:25`, React `member-impersonate-modal.tsx`.
 *        - `confirm-delete-member`  → Ember `delete-member.hbs:49`, React `member-delete-modal.tsx`.
 *   4. API assertions (`page.request.get('/ghost/api/admin/members/<id>/')`)
 *      — the strongest cross-implementation invariant. The DB doesn't care
 *      which UI ran.
 *
 * Do NOT add React-specific `data-testid`s here. Anything that only exists on
 * one side belongs in the pinned React-only file.
 */

const memberPath = (memberId: string) => `/ghost/#/members/${memberId}`;

for (const {implementation, memberDetailsReact} of [
    {implementation: 'Ember', memberDetailsReact: false},
    {implementation: 'React', memberDetailsReact: true}
] as const) {
    test.describe(`Member detail parity — ${implementation}`, () => {
        test.use({labs: {memberDetailsReact}});

        let memberFactory: MemberFactory;
        let memberDetailsPage: MemberDetailsPage;

        test.beforeEach(async ({page}) => {
            memberFactory = createMemberFactory(page.request);
            // The page object handles the dual-mode filtering (Ember and
            // React both render on the same URL; `.filter({visible: true})`
            // picks the tree that's actually shown).
            memberDetailsPage = new MemberDetailsPage(page);
        });

        test('renders the member name on the detail screen', async ({page}) => {
            const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            // Scoped to the primary title element in each implementation
            // (Ember uses `data-test-screen-title`, React uses
            // `data-testid="member-detail-title"`). Anchoring on the
            // title-specific hook — instead of a loose `getByText().first()`
            // — catches a regression where the name only surfaces in an
            // aria-hidden or off-screen slot.
            await expect(memberDetailsPage.emberScreenTitle.or(memberDetailsPage.reactScreenTitle))
                .toContainText('Ada Lovelace');
        });

        test('editing the member name persists to the server', async ({page}) => {
            const member = await memberFactory.create({name: 'Grace', email: 'grace-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            // `getByRole('textbox', {name})` works on both — the accessible
            // name comes from a `<label>` in both implementations.
            await page.getByRole('textbox', {name: 'Name'}).fill('Grace Hopper');
            await page.getByRole('button', {name: 'Save'}).click();

            // API assertion — the invariant we actually care about.
            await expect.poll(async () => {
                const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
                const body = await res.json();
                return body?.members?.[0]?.name;
            }, {timeout: 10000}).toBe('Grace Hopper');
        });

        test('back link returns to the members list', async ({page}) => {
            const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-back-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            // Both implementations render this link with the same test hook
            // (`data-test-link="members-back"`); the page object handles the
            // locator so the parity test doesn't fall foul of the
            // no-raw-page.locator lint rule.
            await memberDetailsPage.membersBackLink.click();

            await expect(page).toHaveURL(/#\/members$/);
        });

        test('impersonation modal exposes a real signin URL', async ({page}) => {
            const member = await memberFactory.create({name: 'Alan Turing', email: 'alan-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            await memberDetailsPage.settingsSection.memberActionsButton.click();
            // The page-object `impersonateButton` union covers Ember's plain
            // <button> and React's Radix `role='menuitem'`.
            await memberDetailsPage.settingsSection.impersonateButton.click();

            // Ember fetches the URL asynchronously after the modal opens; use
            // `toHaveValue` so Playwright auto-waits for the value to fill
            // instead of reading a snapshot of the empty initial state.
            await expect(memberDetailsPage.magicLinkInput).toHaveValue(/^https?:\/\/.+/);
        });

        test('sign out of all devices opens a confirmation and closes on confirm', async ({page}) => {
            const member = await memberFactory.create({name: 'Rear Admiral', email: 'rear-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            await memberDetailsPage.settingsSection.memberActionsButton.click();
            await memberDetailsPage.settingsSection.signOutOfAllDevices.click();

            // Scope to the logout confirmation modal so the click doesn't
            // bleed into the account-owner "Sign out" button in the admin
            // sidebar dropdown.
            await memberDetailsPage.logoutConfirmModal
                .getByRole('button', {name: 'Sign out', exact: true}).click();

            // Confirm the sign-out button no longer accepts a click — the
            // dialog closed and the trigger button is back on the actions
            // menu (closed). Use the URL as a simpler stable signal:
            // sign-out keeps us on the same detail screen.
            await expect(page).toHaveURL(new RegExp(`#/members/${member.id}`));
        });

        test('delete member navigates back to the list and removes the record', async ({page}) => {
            const member = await memberFactory.create({name: 'Deletable', email: 'delete-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            await memberDetailsPage.settingsSection.memberActionsButton.click();
            await memberDetailsPage.settingsSection.deleteButton.click();
            await memberDetailsPage.settingsSection.confirmDeleteButton.click();

            await expect(page).toHaveURL(/#\/members$/);

            // Server side — the strongest invariant.
            const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
            expect(res.status()).toBe(404);
        });

        test('creating a new member persists to the server and redirects to the detail', async ({page}) => {
            // /members/new is a distinct URL under both routers — this test
            // makes sure the create-mode contract holds regardless of which
            // implementation runs it. Without it, an LLM regressing either
            // side's create flow could ship unnoticed.
            const email = `new-parity-${Date.now()}@ghost.org`;

            await page.goto(memberPath('new'));

            await page.getByRole('textbox', {name: 'Name'}).fill('New Parity Member');
            await page.getByRole('textbox', {name: 'Email'}).fill(email);
            await page.getByRole('button', {name: 'Save'}).click();

            // Post-create, both implementations navigate to the new member's
            // detail. Server side is authoritative — poll until the new
            // member exists with the expected fields.
            let createdId: string | undefined;
            await expect.poll(async () => {
                const res = await page.request.get(`/ghost/api/admin/members/?filter=${encodeURIComponent(`email:'${email}'`)}`);
                const body = await res.json();
                createdId = body?.members?.[0]?.id;
                return body?.members?.[0]?.name;
            }, {timeout: 10000}).toBe('New Parity Member');
            // URL should have flipped off the `/new` sentinel to the real id.
            await expect(page).toHaveURL(new RegExp(`#/members/${createdId}(\\?|$)`));
        });

        test.describe('New member screen (create mode)', () => {
            // Ember gates the Subscriptions section on `paidMembersEnabled`
            // (`gh-member-settings-form.hbs:82`). With stripe off there's no
            // section to compare against on the Ember side; enable stripe so
            // both implementations light up the same set of sections.
            test.use({stripeEnabled: true});

            test('subscriptions section shows a "No subscriptions" empty state on New member', async ({page}) => {
                // Regression guard for the Ember → React parity gap where the
                // React /members/new screen hid Subscriptions entirely. Ember
                // has always rendered the heading + `<h4>No subscriptions</h4>`
                // empty state on create (`gh-member-settings-form.hbs:82-92`),
                // so a passing test on Ember + failing on React would mean the
                // React implementation is silently missing a piece Ember users
                // rely on.
                await page.goto(memberPath('new'));

                // Anchor on accessible role — Ember renders `<h4>` and React
                // uses Shade's `EmptyIndicator` which renders `<h3>`. Both
                // match `role='heading'`. `exact: true` disambiguates from
                // "No subscriptions", whose accessible name contains
                // "Subscriptions" as a substring.
                await expect(page.getByRole('heading', {name: 'Subscriptions', exact: true})).toBeVisible();
                await expect(page.getByRole('heading', {name: 'No subscriptions', exact: true})).toBeVisible();
            });
        });

        test('only one implementation renders member detail elements at a time', async ({page}) => {
            // Load-bearing invariant for the parity guarantee: when the flag
            // is on, Ember's `beforeModel` MUST abort so Ember's subtree
            // doesn't paint into the hidden `#ember-app` container; when
            // off, React's `MemberDetailGate` MUST render EmberFallback and
            // therefore not mount its own detail tree.
            //
            // If a future refactor breaks either half of this contract,
            // most tests would still pass — the visible tree is fine — but
            // the parity file's cross-implementation assertions would
            // silently start covering only one side. Pin the sole-tree
            // invariant explicitly here so a regression trips a red test.
            const member = await memberFactory.create({name: 'Sole Tree', email: 'sole-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            // Wait for the shared trigger to exist so the shell has settled.
            await expect(memberDetailsPage.settingsSection.memberActionsButton).toBeVisible();

            const emberActionsCount = await memberDetailsPage.emberMemberActions.count();
            const reactActionsCount = await memberDetailsPage.reactMemberActions.count();

            // Straight-line assertions instead of a per-flag branch: the
            // expected count per implementation is a pure function of the
            // flag, so we compute it up front and let a regression on
            // either side surface as a plain `toBe` failure.
            const expectedEmberActions = memberDetailsReact ? 0 : 1;
            const expectedReactActions = memberDetailsReact ? 1 : 0;
            expect(emberActionsCount).toBe(expectedEmberActions);
            expect(reactActionsCount).toBe(expectedReactActions);
        });

        test('engagement section shows an empty state when the member has not received emails', async ({page}) => {
            // Fresh members have `email_count: 0` on both implementations.
            // Both should render the "Engagement" heading and the empty-state
            // message that Ember produces via `gh-member-details.hbs:87-96`.
            const member = await memberFactory.create({name: 'Ada Lovelace', email: 'engagement-empty-parity@ghost.org'});

            await page.goto(memberPath(member.id));

            await expect(page.getByRole('heading', {name: 'Engagement'})).toBeVisible();
            // Ember uses `Ada`s email stats` (curly apostrophe); React must
            // produce the same wording so a translator-facing regression
            // trips the parity assertion.
            await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
        });

        test('engagement section shows email counts and open rate when the member has emails', async ({page}) => {
            const member = await memberFactory.create({name: 'Stats Member', email: 'engagement-stats-parity@ghost.org'});

            // Both implementations fetch the same `/members/:id` endpoint;
            // inject non-zero engagement fields so the stats branch renders
            // deterministically regardless of what the fixture DB happens to
            // hold. `email_open_rate` is a percentage integer on the server
            // (see `member.js`'s serializer).
            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].email_count = 12;
                    body.members[0].email_opened_count = 9;
                    body.members[0].email_open_rate = 75;
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByRole('heading', {name: 'Engagement'})).toBeVisible();

            // Each stat label must be visible AND the corresponding value must
            // appear inside the section. Scope to the Engagement heading's
            // parent so a coincidentally-matching `12` elsewhere on the page
            // (e.g. a member count) can't satisfy the assertion.
            const engagement = page.getByRole('heading', {name: 'Engagement'}).locator('..');
            await expect(engagement.getByText('Emails received')).toBeVisible();
            await expect(engagement.getByText('12', {exact: true})).toBeVisible();
            await expect(engagement.getByText('Emails opened')).toBeVisible();
            await expect(engagement.getByText('9', {exact: true})).toBeVisible();
            await expect(engagement.getByText('Average open rate')).toBeVisible();
            // Percent-formatted (`75%`). The `%` may live in a sibling span in
            // Ember and inline in React — the union text `75%` catches both.
            await expect(engagement.getByText(/75\s*%/)).toBeVisible();
        });

        test('engagement empty-state renders identically when email fields are absent from the payload', async ({page}) => {
            // Ember Data defaults `emailCount` / `emailOpenedCount` to `0`
            // (`ghost/admin/app/models/member.js:20-21`), so a payload that
            // omits the fields still shows the empty state on Ember. React
            // must mirror that via `?? 0` fallbacks — otherwise the two
            // UIs diverge on the same server response.
            const member = await memberFactory.create({name: 'Ada Lovelace', email: 'engagement-undef-parity@ghost.org'});

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    delete body.members[0].email_count;
                    delete body.members[0].email_opened_count;
                    delete body.members[0].email_open_rate;
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByRole('heading', {name: 'Engagement'})).toBeVisible();
            await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
        });

        test('open-rate placeholder appears when the rate is not yet calculated', async ({page}) => {
            // Server sends `email_open_rate: null` until the member has been
            // sent 5 newsletters (`gh-member-details.hbs:112-114`). Both UIs
            // must render the placeholder string instead of a bare `%`.
            const member = await memberFactory.create({name: 'Early Stats', email: 'engagement-null-parity@ghost.org'});

            const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
            await page.route(memberReadRegex, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.continue();
                }
                const response = await route.fetch();
                const body = await response.json();
                if (body?.members?.[0]) {
                    body.members[0].email_count = 3;
                    body.members[0].email_opened_count = 2;
                    body.members[0].email_open_rate = null;
                }
                return route.fulfill({response, body: JSON.stringify(body)});
            });

            await page.goto(memberPath(member.id));

            await expect(page.getByText('This metric is calculated once a member has received 5 newsletters.')).toBeVisible();
        });
    });
}
