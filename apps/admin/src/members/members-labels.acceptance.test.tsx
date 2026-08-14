import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {fakeAdminEndpoint, fakeMembers, label, member, renderAdminApp} from '@test-utils/acceptance';
import {membersScreen} from './members.screen';

describe('Members label filters', () => {
    it('selects one label', async () => {
        const vip = label({name: 'VIP', slug: 'vip'});
        const membersApi = fakeMembers(({filter}) => filter
            ? [member({name: 'VIP Member', labels: [vip]})]
            : [member({name: 'VIP Member', labels: [vip]}), member({name: 'Regular Member'})], {labels: [vip]});
        await renderAdminApp('/members');

        await membersScreen.addMultiselectFilter('Label', ['VIP']);

        await expect(membersApi).toHaveSentFilter('label:[vip]');
        await expect(membersScreen.memberRows()).toHaveCount(1);
        await expect.element(membersScreen.link('VIP Member')).toBeVisible();
    });

    it('selects multiple labels', async () => {
        const vip = label({name: 'VIP', slug: 'vip'});
        const premium = label({name: 'Premium', slug: 'premium'});
        const membersApi = fakeMembers(({filter}) => filter?.includes('premium') ? member.many(3) : member.many(4), {labels: [vip, premium]});
        await renderAdminApp('/members');

        await membersScreen.addMultiselectFilter('Label', ['VIP', 'Premium']);

        await expect(membersApi).toHaveSentFilter('label:[premium,vip]');
        await expect(membersScreen.memberRows()).toHaveCount(3);
    });

    it('searches label options', async () => {
        const searchable = label({name: 'Searchable-Label', slug: 'searchable-label'});
        const membersApi = fakeMembers(({filter}) => filter ? [member({name: 'Targeted Member'})] : member.many(3), {
            labels: [searchable, label({name: 'Different-Label'})]
        });
        await renderAdminApp('/members');

        await membersScreen.addSearchableFilter('Label', 'Searchable', 'Searchable-Label');

        await expect(membersApi).toHaveSentFilter('label:[searchable-label]');
        await expect.element(membersScreen.link('Targeted Member')).toBeVisible();
    });

    it('deselects a label', async () => {
        const vip = label({name: 'VIP', slug: 'vip'});
        const premium = label({name: 'Premium', slug: 'premium'});
        const membersApi = fakeMembers(({filter}) => filter === 'label:[premium]'
            ? [member({name: 'Premium Member'})]
            : member.many(2), {labels: [vip, premium]});
        await renderAdminApp('/members');

        await membersScreen.addMultiselectFilter('Label', ['VIP', 'Premium']);
        await membersScreen.multiselectOption('VIP').click();

        await expect(membersApi).toHaveSentFilter('label:[premium]');
        await expect.element(membersScreen.link('Premium Member')).toBeVisible();
    });

    it('renames a label inline', async () => {
        const oldLabel = label({name: 'Old-Name', slug: 'old-name'});
        const selected = label({name: 'Selected-Label', slug: 'selected-label'});
        fakeMembers(member.many(2), {labels: [oldLabel, selected]});
        const editApi = fakeAdminEndpoint('PUT', `/labels/${oldLabel.id}/`, ({body}) => body);
        await renderAdminApp('/members');

        await membersScreen.addMultiselectFilter('Label', ['Selected-Label']);
        await membersScreen.openMultiselectValue('Selected-Label');
        await page.getByRole('button', {name: 'Edit label Old-Name'}).click();
        await page.getByRole('textbox').last().fill('New-Name');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        await expect.poll(() => editApi.lastRequest?.body).toEqual({labels: [{id: oldLabel.id, name: 'New-Name'}]});
    });

    it('deletes a label inline', async () => {
        const deleted = label({name: 'Delete-Me', slug: 'delete-me'});
        const selected = label({name: 'Selected-Label', slug: 'selected-label'});
        fakeMembers(member.many(2), {labels: [deleted, selected]});
        const deleteApi = fakeAdminEndpoint('DELETE', `/labels/${deleted.id}/`, {});
        await renderAdminApp('/members');

        await membersScreen.addMultiselectFilter('Label', ['Selected-Label']);
        await membersScreen.openMultiselectValue('Selected-Label');
        await page.getByRole('button', {name: 'Edit label Delete-Me'}).click();
        await page.getByRole('button', {name: 'Delete', exact: true}).click();
        await page.getByRole('button', {name: 'Delete', exact: true}).click();

        await expect.poll(() => deleteApi.requests.length).toBe(1);
    });
});
