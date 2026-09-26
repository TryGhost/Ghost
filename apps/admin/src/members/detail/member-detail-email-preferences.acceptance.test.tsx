import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  member,
  newsletter,
  renderAdminApp,
} from '@test-utils/acceptance';
import { memberDetailScreen } from './member-detail.screen';

describe.each([false, true])('Member email preferences with automations=%s', (automations) => {
  it.each([false, true])(
    'saves newsletter changes with the appropriate preference payload (creating=%s)',
    async (creating) => {
      const news = newsletter({ name: 'Weekly', subscribe_on_signup: true });
      let current = {
        ...member({ name: 'Ada', newsletters: [news] }),
        enable_updates_and_announcements: null,
      };
      fakeMembers([current]);
      fakeNewsletters([news]);
      fakeAdminEndpoint('GET', new RegExp(`^/members/${current.id}/`), () => ({
        members: [current],
      }));
      fakeAdminEndpoint('GET', /^\/members\/events\//, {
        events: [],
        meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
      });
      const saveApi = fakeAdminEndpoint(
        creating ? 'POST' : 'PUT',
        creating ? '/members/' : new RegExp(`^/members/${current.id}/`),
        ({ body }) => {
          const saved = (body as { members: Array<Record<string, unknown>> }).members[0];
          current = { ...current, ...saved };
          return { members: [current] };
        },
      );

      await renderAdminApp(`/members/${creating ? 'new' : current.id}`, {
        labs: { automations },
      });

      const newsletterToggle = page.getByRole('switch', { name: 'Subscribe to Weekly' });
      await expect.element(newsletterToggle).toBeChecked();
      const updatesToggle = page.getByRole('switch', { name: 'Updates & announcements' });
      if (automations) {
        await expect.element(updatesToggle).toBeChecked();
      } else {
        await expect.element(updatesToggle).not.toBeInTheDocument();
      }

      if (creating) {
        await page.getByLabelText('Email', { exact: true }).fill('ada@example.com');
      }
      await newsletterToggle.click();
      await memberDetailScreen.saveButton().click();
      await expect.poll(() => saveApi.requests.length).toBe(1);

      const saved = (saveApi.lastRequest?.body as { members: Array<Record<string, unknown>> })
        .members[0];
      expect(saved.newsletters).toEqual([]);
      if (automations) {
        // Changing newsletters preserves the visible, initially inherited preference.
        expect(saved.enable_updates_and_announcements).toBe(true);
      } else {
        expect(saved).not.toHaveProperty('enable_updates_and_announcements');
      }
    },
  );
});
