import { MembersImportService, type MembersListResponse } from '@/helpers/services/members-import';
import { createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

const BOUNDARY_TIMESTAMP = '2025-01-02T10:00:00.000Z';
const OLDER_TIMESTAMP = '2025-01-02T09:59:59.000Z';
const BOUNDARY_MEMBERS = 75;

interface SignupEvent {
  type: string;
  data: { id: string; member_id: string; created_at: string };
}

test.describe('Ghost Admin - Member activity pagination', () => {
  test.use({ labs: { membersActivityReact: true } });
  let createdMemberIds: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const id of createdMemberIds) {
      await page.request.delete(`/ghost/api/admin/members/${id}/`);
    }
    createdMemberIds = [];
  });

  test('shows every signup when more than one page shares a timestamp', async ({ page }) => {
    test.slow();
    const memberFactory = createMemberFactory(page.request);
    // CSV import supports backdated created_at values for signup events;
    // ordinary member creation ignores that field. This guarantees a full-page
    // collision independently of machine speed.
    const members = Array.from({ length: BOUNDARY_MEMBERS + 1 }, (_, index) => {
      const suffix = String(index + 1).padStart(3, '0');
      return memberFactory.build({
        name: `Pagination Member ${suffix}`,
        email: `pagination-member-${suffix}@example.com`,
        newsletters: [],
        created_at: index < BOUNDARY_MEMBERS ? BOUNDARY_TIMESTAMP : OLDER_TIMESTAMP,
      });
    });
    const importService = new MembersImportService(page.request);
    const importResult = await importService.import(members);
    const membersResponse = await page.request.get('/ghost/api/admin/members/', {
      params: { filter: `label:${importResult.meta.import_label.slug}`, limit: '100' },
    });
    expect(membersResponse.ok()).toBe(true);
    const imported = (await membersResponse.json()) as MembersListResponse;
    createdMemberIds = imported.members.map((member) => member.id);
    expect(createdMemberIds).toHaveLength(BOUNDARY_MEMBERS + 1);

    const filter = `type:signup_event+data.member_id:[${createdMemberIds.join(',')}]`;
    let events: SignupEvent[] = [];
    // Signup events are persisted asynchronously. Verify the actual endpoint's
    // timestamps before exercising the browser; no mocked API or direct DB writes.
    await expect
      .poll(async () => {
        const response = await page.request.get('/ghost/api/admin/members/events/', {
          params: { filter, limit: '100' },
        });
        const data = await response.json();
        events = data.events ?? [];
        return events.map((event) => event.data.member_id).sort();
      })
      .toEqual([...createdMemberIds].sort());
    expect(events.filter((event) => event.data.created_at === BOUNDARY_TIMESTAMP)).toHaveLength(
      BOUNDARY_MEMBERS,
    );
    expect(events.filter((event) => event.data.created_at === OLDER_TIMESTAMP)).toHaveLength(1);

    await page.goto('/ghost/#/members-activity');
    await expect(page.getByTestId('member-activity-page')).toBeVisible();
    const table = page.getByRole('table', { name: 'Member activity' });
    const memberLinks = table.getByRole('link', { name: /Pagination Member/ });
    await expect(memberLinks).toHaveCount(50);

    await table.getByRole('row').last().scrollIntoViewIfNeeded();
    await expect(memberLinks).toHaveCount(BOUNDARY_MEMBERS + 1);

    const displayedMemberIds = await memberLinks.evaluateAll((links) =>
      links.map((link) => {
        const hash = new URL((link as HTMLAnchorElement).href).hash;
        return new URLSearchParams(hash.slice(hash.indexOf('?') + 1)).get('member');
      }),
    );
    expect(displayedMemberIds.sort()).toEqual([...createdMemberIds].sort());
    await expect(table.getByRole('row').last()).toContainText('Pagination Member 076');
    await expect(page.getByText('Couldn’t load more activity', { exact: true })).toBeHidden();
  });
});
