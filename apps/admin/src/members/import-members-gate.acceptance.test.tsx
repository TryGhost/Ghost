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
 * import-members/modal.test.tsx, and the redesigned one by
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
  it.each([false, true])(
    'inherits portal typography in the import flow (redesigned: %s)',
    async (membersImportRedesign) => {
      await openMappingStep({ admin7PageChrome: true, membersImportRedesign });
      const modal = membersScreen.dialog();
      await expect.element(modal).toBeVisible();
      expect(modal.element().closest('#root')).toBeNull();
      const select = page.getByRole('combobox').first();
      await expect.element(select).toBeVisible();
      const hasFont = () => getComputedStyle(modal.element()).fontFamily.includes('Inter Admin 7');
      await expect.poll(hasFont).toBe(true);
      expect(getComputedStyle(select.element()).fontVariationSettings).toBe('"opsz" 14');
      expect(getComputedStyle(select.element()).fontFeatureSettings).toBe(
        '"cv05", "dlig", "ss01", "zero"',
      );

      const originalModal = modal.element();
      try {
        await page.viewport(800, 800);
        await expect.element(modal).toBeVisible();
        expect(modal.element()).toBe(originalModal);
        await expect.poll(hasFont).toBe(false);
        expect(getComputedStyle(select.element()).fontVariationSettings).toBe('normal');
        await page.viewport(801, 800);
        await expect.poll(hasFont).toBe(true);
      } finally {
        await page.viewport(1280, 800);
      }
    },
  );

  it('serves the redesigned import when the flag is on', async () => {
    await openMappingStep({ membersImportRedesign: true });

    // A checkbox per column exists only in the redesigned dialog: it is what decides whether
    // a column is imported there, a job the select does in the import as it shipped.
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

  // Custom fields are no longer what chooses between the two: they are an experiment the
  // redesign is meant to ship ahead of, so on their own they must move nothing.
  it('serves the import as it shipped when only custom fields are on', async () => {
    await openMappingStep({ membersCustomFields: true });

    await expect.element(importMembersScreen.importToggle('name')).not.toBeInTheDocument();
    await expect.element(page.getByRole('combobox').first()).toBeVisible();
  });
});
