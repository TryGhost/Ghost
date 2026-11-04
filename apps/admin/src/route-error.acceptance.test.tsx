import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import { renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));
vi.mock('@/editor/editor-screen', () => ({
  default: () => {
    throw new Error('Editor crashed');
  },
}));

it('offers to reload the admin at a screen that crashed', async () => {
  await renderAdminApp('/editor/post/abc123');

  await page.getByRole('alert').getByRole('button', { name: 'Reload' }).click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/editor/post/abc123']]);
});
