import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import { currentRoute, failModuleLoads, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { sidebarScreen } from '@/layout/sidebar.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

const reloadButton = () => page.getByRole('alert').getByRole('button', { name: 'Reload' });

// A failed module stays failed for the rest of the file, so each test fails modules of its own.
describe('Code that fails to load', () => {
  beforeEach(() => {
    vi.mocked(reloadAdmin).mockClear();
  });

  it('reloads the admin at the screen whose code failed to load', async () => {
    await failModuleLoads('/src/members/members.tsx');
    await renderAdminApp('/members?search=jamie');

    await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/members?search=jamie']]);
  });

  it('reloads the admin at the editor when the editor failed to load', async () => {
    await failModuleLoads('/src/editor/editor-screen.tsx');
    await renderAdminApp('/editor/post/abc123', { labs: { editorReact: true } });

    await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/editor/post/abc123']]);
  });

  it('offers a reload instead of reloading again when code fails to load soon after', async () => {
    await failModuleLoads('/src/posts/list/posts-route.tsx');
    await failModuleLoads('/src/posts/list/pages-route.tsx');
    await renderAdminApp('/posts');
    await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/posts']]);

    await sidebarScreen.navLink('Pages').click();
    await expect.poll(currentRoute).toBe('/pages');
    await reloadButton().click();

    await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/posts'], ['/pages']]);
  });
});
