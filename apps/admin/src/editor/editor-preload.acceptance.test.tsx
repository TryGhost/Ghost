import { describe, expect, it } from 'vitest';

import { fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { tagsScreen } from '@/tags/tags.screen';

/** Whether the page has fetched a module, matched by the end of its path. */
const fetched = (pathEnd: string) =>
  performance
    .getEntriesByType('resource')
    .some((entry) => new URL(entry.name).pathname.endsWith(pathEnd));

describe('Editor preload', () => {
  it('fetches the React editor and Koenig before a post is opened', async () => {
    // The dev server serves every module separately, overflowing the default 250 entries.
    performance.setResourceTimingBufferSize(5000);
    fakeTags([]);
    await renderAdminApp('/tags', { labs: { editorReact: true } });

    await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
    await expect.poll(() => fetched('/src/editor/editor-screen.tsx')).toBe(true);
    await expect.poll(() => fetched('koenig-lexical.js')).toBe(true);
  });
});
