import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, fakeMembers, member, renderAdminApp } from '@test-utils/acceptance';

describe('Member creation source', () => {
  it.each([
    { name: 'free signup', type: 'signup_event', data: { source: 'admin' } },
    {
      name: 'paid signup',
      type: 'subscription_event',
      data: { type: 'created', signup: true, source: 'stripe', creation_source: 'admin' },
    },
  ])('shows the creation method for a $name in recent and full activity', async (event) => {
    const jamie = member({ name: 'Jamie Larson' });
    fakeMembers([jamie]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${jamie.id}/`), {
      members: [{ ...jamie, attribution: null }],
    });
    fakeAdminEndpoint('GET', /^\/members\/events\//, {
      events: [
        {
          type: event.type,
          data: {
            id: 'created-event',
            member_id: jamie.id,
            created_at: jamie.created_at,
            member: jamie,
            ...event.data,
          },
        },
      ],
    });
    await renderAdminApp(`/members/${jamie.id}`);

    await expect
      .element(page.getByText('Signed up via manual entry', { exact: true }))
      .toBeVisible();
    await page.getByRole('link', { name: /View all member activity/ }).click();
    await expect.element(page.getByRole('heading', { name: 'Jamie Larson' })).toBeVisible();
    await expect
      .element(page.getByText('Signed up via manual entry', { exact: true }))
      .toBeVisible();
  });
});
