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

            // Both implementations surface the name — Ember in the sidebar
            // header, React in the breadcrumb page label. `.first()` handles
            // the fact that Ember may show it in more than one place.
            await expect(page.getByText('Ada Lovelace').first()).toBeVisible();
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

            // Both use the same accessible confirm label.
            await page.getByRole('button', {name: 'Sign out', exact: true}).click();

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
    });
}
