import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Member activity session override', () => {
  test.use({ labs: { membersActivityReact: false } });

  test('keeps the React URL override for the session and returns to Ember after clearing and reloading', async ({
    page,
  }) => {
    const reactPage = page.getByTestId('member-activity-page');
    const heading = page.getByRole('heading', { name: 'Member activity', exact: true });

    await page.goto('/ghost/#/members-activity?labs=membersActivityReact');
    await expect(reactPage).toBeVisible();
    await expect(heading).toBeVisible();

    // A fresh document without the query parameter retains the session choice.
    await page.goto('/ghost/#/members-activity');
    await page.reload();
    await expect(reactPage).toBeVisible();
    await expect(heading).toBeVisible();

    // Reload after clearing so both routers start with the same ownership state.
    await page.goto('/ghost/#/members-activity?labs=');
    await page.reload();
    await expect(reactPage).toBeHidden();
    await expect(heading).toBeVisible();
  });
});
