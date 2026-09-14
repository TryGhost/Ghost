import { MemberDetailsPage } from '@/admin-pages';
import { createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

for (const react of [false, true]) {
  test.describe(`Ghost Admin - Member activity (${react ? 'React' : 'Ember'})`, () => {
    test.use({ labs: { membersActivityReact: react } });
    let createdMemberIds: string[] = [];

    test.afterEach(async ({ page }) => {
      for (const id of createdMemberIds) {
        await page.request.delete(`/ghost/api/admin/members/${id}/`);
      }
      createdMemberIds = [];
    });

    test('follows a member from all activity to their profile and preserves activity filters', async ({
      page,
    }) => {
      const memberFactory = createMemberFactory(page.request);
      const members = await memberFactory.createMany([
        { name: 'Activity Target', email: 'activity-target@example.com', newsletters: [] },
        { name: 'Activity Other', email: 'activity-other@example.com', newsletters: [] },
      ]);
      createdMemberIds = members.map(({ id }) => id);
      const [member, otherMember] = members;

      // Signup events are written asynchronously. Wait until both are older
      // than Activity's second-precision cursor before opening the page.
      await expect
        .poll(async () => {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const response = await page.request.get('/ghost/api/admin/members/events/', {
            params: {
              filter: `type:signup_event+data.member_id:[${members.map(({ id }) => id).join(',')}]+data.created_at:<'${now}'`,
              limit: '50',
            },
          });
          const data = await response.json();
          return data.events?.length;
        })
        .toBe(2);

      await page.goto('/ghost/#/members-activity');
      await expect(page.getByTestId('member-activity-page')).toBeVisible({ visible: react });

      await expect(
        page.getByRole('heading', { name: 'Member activity', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Member', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /Activity Other/ })).toBeVisible();
      await page.getByRole('link', { name: /Activity Target/ }).click();

      await expect(page).toHaveURL(new RegExp(`#/members-activity\\?member=${member.id}$`));
      await expect(
        page.getByRole('heading', { name: 'Activity Target', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Member', exact: true })).toBeHidden();
      await expect(page.getByText('Signed up', { exact: true })).toBeVisible();
      await expect(page.getByText(otherMember.email, { exact: true })).toBeHidden();

      await page.getByRole('link', { name: /View member profile/ }).click();
      await expect(page).toHaveURL(new RegExp(`#/members/${member.id}$`));
      await expect(new MemberDetailsPage(page).emailInput).toHaveValue(member.email);

      await page.getByRole('link', { name: /View all member activity/ }).click();
      await expect(page).toHaveURL(new RegExp(`#/members-activity\\?member=${member.id}$`));

      await page.getByRole('button', { name: 'Filter events' }).click();
      await page.getByText('Signups', { exact: true }).click();
      await expect(page).toHaveURL(/excludedEvents=signup_event/);
      await page.reload();

      await expect(
        page.getByText('No activities match the current filter', { exact: true }),
      ).toBeVisible();
      await page.getByRole('link', { name: 'Show all activity' }).click();

      await expect(page).toHaveURL(/#\/members-activity\/?$/);
      await expect(page.getByRole('link', { name: /Activity Target/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Activity Other/ })).toBeVisible();
    });
  });
}
