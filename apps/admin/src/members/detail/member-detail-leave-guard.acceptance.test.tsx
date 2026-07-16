import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {fakeAdminEndpoint, fakeMembers, member, renderAdminApp, type Member} from '@test-utils/acceptance';

const FLAGS = {labs: {memberDetailsReact: true}};

function fakeMemberDetailWorld(m: Member) {
    fakeMembers([m]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), {members: [m]});
    fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
        events: [],
        meta: {pagination: {page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null}}
    });
}

/**
 * The unsaved-changes guard must cover BOTH ways of leaving the screen:
 *
 * - react-router navigations (the breadcrumb Link) — guarded by `useBlocker`.
 * - native `<a href="#/…">` anchors (the admin sidebar, links into
 *   Ember-owned routes) — those create a history entry react-router didn't
 *   make and reach it as an untracked POP it cannot block, so they're guarded
 *   separately by `useHashLinkNavigationGuard` (the React port of Ember's
 *   `trailing-hash.js` click interception).
 */
describe('Member detail leave guard', () => {
    it('guards leaving via the breadcrumb (react-router link) with unsaved edits', async () => {
        const m = member({name: 'Ada Lovelace'});
        fakeMemberDetailWorld(m);
        await renderAdminApp(`/members/${m.id}`, FLAGS);

        await page.getByLabelText('Name').fill('Ada B');
        await page.getByTestId('member-detail').getByRole('link', {name: 'Members'}).click();

        await expect.element(page.getByText('Discard unsaved changes?')).toBeVisible();
    });

    it('guards leaving via the sidebar (native hash anchor) with unsaved edits', async () => {
        const m = member({name: 'Ada Lovelace'});
        fakeMemberDetailWorld(m);
        await renderAdminApp(`/members/${m.id}`, FLAGS);

        await page.getByLabelText('Name').fill('Ada B');
        await page.getByRole('link', {name: 'Members'}).first().click();

        await expect.element(page.getByText('Discard unsaved changes?')).toBeVisible();
    });

    it('keeps editing on cancel and completes the navigation on Leave', async () => {
        const m = member({name: 'Ada Lovelace'});
        fakeMemberDetailWorld(m);
        await renderAdminApp(`/members/${m.id}`, FLAGS);

        await page.getByLabelText('Name').fill('Ada B');
        await page.getByRole('link', {name: 'Members'}).first().click();

        await page.getByRole('button', {name: 'Keep editing'}).click();
        await expect.element(page.getByLabelText('Name')).toHaveValue('Ada B');

        await page.getByRole('link', {name: 'Members'}).first().click();
        await page.getByRole('button', {name: 'Leave'}).click();
        await expect.element(page.getByText('New member')).toBeVisible();
    });
});
