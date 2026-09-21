import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeMembers, member, renderAdminApp } from '@test-utils/acceptance';
import { membersScreen } from './members.screen';

const mobileSearch = () =>
  page.getByRole('textbox', { name: 'Search members mobile', exact: true });

async function expectPrimaryInViewport() {
  await expect
    .poll(() => {
      const rect = membersScreen.newMemberLink().element().getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    })
    .toBe(true);
}

afterEach(async () => {
  await page.viewport(1280, 800);
});

it.each([
  { width: 320, admin7Pill: true },
  { width: 375, admin7Pill: true },
  { width: 1023, admin7Pill: true },
  { width: 375, admin7Pill: false },
])(
  'keeps member actions reachable while searching at $width px (Admin 7: $admin7Pill)',
  async ({ width, admin7Pill }) => {
    await page.viewport(width, 800);
    const membersApi = fakeMembers([member({ name: 'Review Member' })]);
    await renderAdminApp('/members', { labs: { admin7Pill } });

    await page.getByRole('button', { name: 'Show member search', exact: true }).click();
    await expect.element(mobileSearch()).toHaveFocus();
    await mobileSearch().fill('Review');
    await expect(membersApi).toHaveSentSearch('Review');
    await expectPrimaryInViewport();

    await membersScreen.openActionsMenu();
    await expect.element(membersScreen.menuItem('Import members')).toBeVisible();
  },
);

it.each([375, 768])(
  'shows a saved member search without overlapping filter actions at %s px',
  async (width) => {
    await page.viewport(width, 800);
    fakeMembers([member({ name: 'Review Member' })]);
    await renderAdminApp('/members?search=Review&filter=status:free', {
      labs: { admin7Pill: true },
    });

    await expect.element(mobileSearch()).toHaveValue('Review');
    await expectPrimaryInViewport();
    const saveView = page.getByRole('button', { name: 'Save view', exact: true });
    await expect.element(saveView).toBeVisible();
    await expect
      .poll(() => {
        const search = mobileSearch().element().getBoundingClientRect();
        const save = saveView.element().getBoundingClientRect();
        return save.top >= search.bottom;
      })
      .toBe(true);
    await mobileSearch().fill('Updated');
    await saveView.click();
    await expect.element(page.getByPlaceholder('View name')).toBeVisible();
  },
);

it('preserves desktop expansion, Escape focus and the query when resizing to mobile', async () => {
  await page.viewport(1024, 800);
  const membersApi = fakeMembers([member({ name: 'Review Member' })]);
  await renderAdminApp('/members', { labs: { admin7Pill: true } });

  const searchTrigger = page.getByRole('button', { name: 'Search members', exact: true });
  await searchTrigger.click();
  await expect.element(membersScreen.searchInput()).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await expect.element(searchTrigger).toHaveFocus();
  await searchTrigger.click();
  await membersScreen.searchInput().fill('Review');
  await expect(membersApi).toHaveSentSearch('Review');
  await page.viewport(375, 800);
  await expect.element(mobileSearch()).toHaveValue('Review');
  await expectPrimaryInViewport();
});
