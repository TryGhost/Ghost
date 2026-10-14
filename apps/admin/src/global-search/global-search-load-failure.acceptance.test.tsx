import { expect, it, vi } from 'vitest';

import { failModuleLoads, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { globalSearchScreen } from './global-search.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

// Its own file: every signed-in render preloads the modal, and a loaded module stays loaded.
it('reloads the admin when the search modal failed to load', async () => {
  await failModuleLoads('/src/global-search/global-search-modal.tsx');
  fakeTags([]);
  await renderAdminApp('/tags');

  await globalSearchScreen.openButton().click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags']]);
});
