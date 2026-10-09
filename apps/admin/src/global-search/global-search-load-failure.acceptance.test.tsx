import { expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { failModuleLoads, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { tagsScreen } from '@/tags/tags.screen';
import { globalSearchScreen } from './global-search.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

// Its own file: every signed-in render preloads the modal, and a loaded module stays loaded.
it('reloads the admin when the search modal failed to load, and offers a reload in its place', async () => {
  await failModuleLoads('/src/global-search/global-search-modal.tsx');
  fakeTags([]);
  await renderAdminApp('/tags');

  await globalSearchScreen.openButton().click();
  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags']]);

  await page
    .getByRole('dialog', { name: "Search didn't load" })
    .getByRole('button', { name: 'Reload' })
    .click();
  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags'], ['/tags']]);

  await userEvent.keyboard('{Escape}');
  await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
});
