import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeMemberCustomFields,
  fakeMembers,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { importMembersScreen } from './import-members.screen';
import { membersScreen } from './members.screen';

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
  fakeMembers([member({ name: 'Ada Lovelace' })]);
  fakeMemberCustomFields([]);
  await renderAdminApp('/members', { labs });

  await membersScreen.openActionsMenu();
  await membersScreen.menuItem(/Import members/).click();

  await expect.element(importMembersScreen.dropzone()).toBeVisible();
  await importMembersScreen
    .fileInput()
    .upload(new File([CSV], 'members.csv', { type: 'text/csv' }));
}

describe('Import members gate', () => {
  it('serves the custom fields import when the flag is on', async () => {
    await openMappingStep({ membersCustomFields: true });

    // A checkbox per column exists only in the custom fields experience: it is what decides
    // whether a column is imported there, a job the select does in the import as it shipped.
    await expect.element(importMembersScreen.importToggle('name')).toBeVisible();
  });

  it('serves the import as it shipped when the flag is off', async () => {
    await openMappingStep({});

    // No checkbox, and the selects carry no accessible name — the shipped import never gave
    // them one, which is itself a marker that this is that file and not ours, so the probe
    // stays a bare-role locator on purpose.
    await expect.element(importMembersScreen.importToggle('name')).not.toBeInTheDocument();
    await expect.element(page.getByRole('combobox').first()).toBeVisible();
    await page.getByRole('combobox').first().click();
    await expect.element(importMembersScreen.option('Not imported')).toBeVisible();
  });
});
