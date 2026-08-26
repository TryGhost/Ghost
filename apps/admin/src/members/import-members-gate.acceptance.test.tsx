import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {fakeAdminEndpoint, fakeMembers, member, renderAdminApp} from '@test-utils/acceptance';
import {membersScreen} from './members.screen';

const CSV = 'email,name\nada@example.com,Ada Lovelace\n';

/**
 * The one thing the split can break.
 *
 * Both implementations have their own tests: the import as it shipped is covered by
 * import-members/modal.test.tsx, and the custom fields experience by
 * import-members-custom-fields.acceptance.test.tsx. Neither can regress from the other's
 * changes, because they share no file. What is left is whether the gate hands over to the
 * right one, which is what this asserts — by a marker only that implementation renders.
 */
async function openMappingStep(labs: Record<string, boolean>) {
    fakeMembers([member({name: 'Ada Lovelace'})]);
    fakeAdminEndpoint('GET', new RegExp('^/members/custom_fields/(\\?|$)'), {members_custom_fields: []});
    await renderAdminApp('/members', {labs});

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Import members/).click();

    const dropzone = page.getByRole('button', {name: /select or drop a csv file/i});
    await expect.element(dropzone).toBeVisible();
    const input = dropzone.element().querySelector('input[type=file]');
    if (!(input instanceof HTMLInputElement)) {
        throw new Error('CSV upload input was not rendered');
    }
    await page.elementLocator(input).upload(new File([CSV], 'members.csv', {type: 'text/csv'}));
}

describe('Import members gate', () => {
    it('serves the custom fields import when the flag is on', async () => {
        await openMappingStep({membersCustomFields: true});

        // A checkbox per column exists only in the custom fields experience: it is what decides
        // whether a column is imported there, a job the select does in the import as it shipped.
        await expect.element(page.getByRole('checkbox', {name: 'Import name'})).toBeVisible();
    });

    it('serves the import as it shipped when the flag is off', async () => {
        await openMappingStep({});

        // No checkbox, and the selects carry no accessible name — the shipped import never gave
        // them one, which is itself a marker that this is that file and not ours.
        await expect.element(page.getByRole('checkbox', {name: 'Import name'})).not.toBeInTheDocument();
        await expect.element(page.getByRole('combobox').first()).toBeVisible();
        await page.getByRole('combobox').first().click();
        await expect.element(page.getByRole('option', {name: 'Not imported'})).toBeVisible();
    });
});
