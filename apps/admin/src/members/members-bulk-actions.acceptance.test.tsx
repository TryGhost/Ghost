import {describe, expect, it} from 'vitest';

import {fakeAdminEndpoint, fakeMembers, label, member, renderAdminApp} from '@test-utils/acceptance';
import {membersScreen} from './members.screen';

const bulkResponse = {meta: {stats: {successful: 2, unsuccessful: 0}}};

async function setupBulkActions() {
    const existing = label({name: 'existing', slug: 'existing'});
    fakeMembers(member.many(2, () => ({labels: [existing]})), {labels: [existing]});
    const bulkApi = fakeAdminEndpoint('PUT', /^\/members\/bulk\/\?/, bulkResponse);
    await renderAdminApp('/members?filter=label:existing');
    return {bulkApi, existing};
}

describe('Members bulk actions', () => {
    it('adds a label to filtered members', async () => {
        const {bulkApi, existing} = await setupBulkActions();

        await membersScreen.openActionsMenu();
        await membersScreen.menuItem(/Add label/).click();
        await membersScreen.dialog().getByRole('combobox').click();
        await membersScreen.dialog().getByRole('option', {name: 'existing'}).click();
        await membersScreen.dialog().getByRole('heading').click();
        await membersScreen.dialog().getByRole('button', {name: 'Add label'}).click();

        await expect.poll(() => bulkApi.lastRequest?.body).toEqual({
            bulk: {action: 'addLabel', meta: {label: {id: existing.id}}}
        });
        expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
    });

    it('removes a label from filtered members', async () => {
        const {bulkApi, existing} = await setupBulkActions();

        await membersScreen.openActionsMenu();
        await membersScreen.menuItem(/Remove label/).click();
        await membersScreen.dialog().getByRole('combobox').click();
        await membersScreen.dialog().getByRole('option', {name: 'existing'}).click();
        await membersScreen.dialog().getByRole('heading').click();
        await membersScreen.dialog().getByRole('button', {name: 'Remove label'}).click();

        await expect.poll(() => bulkApi.lastRequest?.body).toEqual({
            bulk: {action: 'removeLabel', meta: {label: {id: existing.id}}}
        });
        expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
    });

    it('unsubscribes all filtered members', async () => {
        const {bulkApi} = await setupBulkActions();

        await membersScreen.openActionsMenu();
        await membersScreen.menuItem(/Unsubscribe/).click();
        await membersScreen.dialog().getByRole('button', {name: 'Unsubscribe'}).click();

        await expect.poll(() => bulkApi.lastRequest?.body).toEqual({
            bulk: {action: 'unsubscribe', meta: {}}
        });
        expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
    });
});
