import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { fakeAdminStats, fakeTags, renderAdminApp } from '@test-utils/acceptance';

describe('Large list page titles (admin7Design)', () => {
  it.each([
    { admin7Design: false, large: false },
    { admin7Design: true, large: true },
  ])(
    'shows the list page title large inside the frame: admin7Design $admin7Design',
    async ({ admin7Design, large }) => {
      fakeTags([]);
      // The frame's top bar shows the site's numbers
      fakeAdminStats.memberCount();
      fakeAdminStats.mrr();
      await renderAdminApp('/tags', { labs: { admin7Design } });

      const title = page.getByRole('heading', { level: 1, name: 'Tags' });
      await expect.element(title).toBeVisible();
      if (large) {
        await expect.element(title).toHaveAttribute('data-large-title');
      } else {
        await expect.element(title).not.toHaveAttribute('data-large-title');
        await expect
          .element(page.getByTestId('tags-page'))
          .not.toHaveAttribute('data-large-title-host');
      }
    },
  );
});
