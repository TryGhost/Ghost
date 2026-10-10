import { expect, it, vi } from 'vitest';

import { failModuleLoads, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

// Its own file: the editor's idle Koenig preload outlives the test and slows the next one.
it('reloads the admin at the editor when the editor failed to load', async () => {
  await failModuleLoads('/src/editor/editor-screen.tsx');
  await renderAdminApp('/editor/post/abc123', { labs: { editorReact: true } });

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/editor/post/abc123']]);
});
