import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, fakeMembers, member, renderAdminApp } from '@test-utils/acceptance';

describe('Member creation source', () => {
  it.each([
    { name: 'manual entry', source: 'admin', action: 'Signed up via manual entry' },
    { name: 'API', source: 'api', action: 'Signed up via API' },
    { name: 'import', source: 'import', action: 'Signed up via import' },
    { name: 'system', source: 'system', action: 'Signed up via system' },
    { name: 'site signup', source: 'member', action: 'Signed up' },
  ])('shows the creation method for $name in recent and full activity', async (event) => {
    const newMember = member({ name: 'Jamie Larson' });
    fakeMembers([newMember]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${newMember.id}/`), {
      members: [{ ...newMember, attribution: null }],
    });
    fakeAdminEndpoint('GET', /^\/members\/events\//, {
      events: [
        {
          type: 'signup_event',
          data: {
            id: 'created-event',
            member_id: newMember.id,
            created_at: newMember.created_at,
            member: newMember,
            source: event.source,
          },
        },
      ],
    });
    await renderAdminApp(`/members/${newMember.id}`);

    await expect.element(page.getByText(event.action, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: /View all member activity/ }).click();
    await expect.element(page.getByRole('heading', { name: 'Jamie Larson' })).toBeVisible();
    await expect.element(page.getByText(event.action, { exact: true })).toBeVisible();
  });
});
