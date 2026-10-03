import { expect, it } from 'vitest';

import { FixtureClient } from './fixture-client';
import { REFRESHED_POST_TITLE } from './recorded-content';

it.each(['source', 'casper'] as const)(
  'refreshes %s data coherently without advancing source revision or reusing a render generation',
  async (fixtureId) => {
    const client = new FixtureClient(fixtureId);
    try {
      const initial = await client.render();
      expect(initial.dataGeneration).toBe(0);
      const updated = await client.refresh({
        snapshot: 'long-title',
        expectedRevision: initial.revision,
        expectedDataGeneration: initial.dataGeneration,
      });
      expect(updated.revision).toBe(initial.revision);
      expect(updated.dataGeneration).toBe(1);
      expect(updated.renderKey).not.toBe(initial.renderKey);
      expect(updated.html.home).toContain(REFRESHED_POST_TITLE);
      expect(updated.html.post).toContain(REFRESHED_POST_TITLE);
      expect(updated.editedFile).toBeUndefined();
      await expect(
        client.refresh({
          snapshot: 'recorded',
          expectedRevision: initial.revision,
          expectedDataGeneration: initial.dataGeneration,
        }),
      ).rejects.toThrow('changed');
      const unchanged = await client.refresh({
        snapshot: 'long-title',
        expectedRevision: updated.revision,
        expectedDataGeneration: updated.dataGeneration,
      });
      expect(unchanged.unchanged).toBe(true);
      expect(unchanged.renderKey).toBe(updated.renderKey);
      expect(unchanged.editMarkerAttribute).toBe(updated.editMarkerAttribute);
      const restored = await client.refresh({
        snapshot: 'recorded',
        expectedRevision: updated.revision,
        expectedDataGeneration: updated.dataGeneration,
      });
      expect(restored.revision).toBe(initial.revision);
      expect(restored.dataGeneration).toBe(2);
      expect(restored.renderKey).not.toBe(initial.renderKey);
      expect(restored.html.post).not.toContain(REFRESHED_POST_TITLE);
      const refreshed = await client.refresh({
        snapshot: 'long-title',
        expectedRevision: restored.revision,
        expectedDataGeneration: restored.dataGeneration,
      });
      const [marker, tagName] = Object.entries(refreshed.inlineTextTargets)[0];
      const edit = {
        marker,
        tagName,
        newText: 'Updated fixture literal',
        expectedRevision: refreshed.revision,
      };
      await expect(
        client.render({ ...edit, expectedDataGeneration: restored.dataGeneration }),
      ).rejects.toThrow('changed');
      const edited = await client.render({
        ...edit,
        expectedDataGeneration: refreshed.dataGeneration,
      });
      expect(edited.revision).not.toBe(refreshed.revision);
      expect(edited.dataGeneration).toBe(refreshed.dataGeneration);
      expect(edited.html.home).toContain(REFRESHED_POST_TITLE);
      expect(edited.html.post).toContain(REFRESHED_POST_TITLE);
      expect(edited.editedFile?.content).toContain('Updated fixture literal');
    } finally {
      client.dispose();
    }
  },
);
