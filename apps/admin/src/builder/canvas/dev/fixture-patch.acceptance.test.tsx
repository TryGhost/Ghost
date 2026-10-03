import { expect, it } from 'vitest';
import { FixtureClient } from './fixture-client';

it.each(['source', 'casper'] as const)(
  'accepts a combined %s Home/Post file and settings patch',
  async (fixtureId) => {
    const client = new FixtureClient(fixtureId);
    try {
      const initial = await client.render();
      const changed = await client.applyThemePatch({
        expectedRevision: initial.revision,
        expectedDataGeneration: initial.dataGeneration,
        files: [
          {
            operation: 'write',
            path: 'home.hbs',
            content:
              '<!doctype html><html><head>{{ghost_head}}</head><body><main>{{> canvas-title}}</main></body></html>',
          },
          {
            operation: 'write',
            path: 'post.hbs',
            content:
              '<!doctype html><html><head>{{ghost_head}}</head><body><article>{{> canvas-title}}</article></body></html>',
          },
          {
            operation: 'write',
            path: 'partials/canvas-title.hbs',
            content: '<h1>Combined canvas patch</h1>',
          },
          { operation: 'delete', path: 'author.hbs' },
        ],
        settings: {
          'global.accent_color': '#123456',
          ...(fixtureId === 'source'
            ? { 'theme.show_featured_posts': true, 'theme.header_style': 'Highlight' }
            : {}),
        },
      });
      expect(changed.revision).not.toBe(initial.revision);
      expect(changed.html.home).toContain('Combined canvas patch');
      expect(changed.html.post).toContain('Combined canvas patch');
      expect(changed.html.home).toContain('#123456');
      expect(changed.dataGeneration).toBe(initial.dataGeneration);
      expect(changed.sourceChanges).toMatchObject({
        'author.hbs': null,
        'partials/canvas-title.hbs': '<h1>Combined canvas patch</h1>',
      });
      expect(changed.workspaceId).toBe(initial.workspaceId);
      const again = await client.render();
      expect(again.revision).toBe(changed.revision);
      expect(again.html.home).toContain('Combined canvas patch');
      expect(again.html.post).toContain('Combined canvas patch');
    } finally {
      client.dispose();
    }
  },
);

it.each(['source', 'casper'] as const)(
  'rejects the complete %s patch when only Post fails',
  async (fixtureId) => {
    const client = new FixtureClient(fixtureId);
    try {
      const initial = await client.render();
      expect(initial.workspaceId).toMatch(/^canvas-theme:/);
      await expect(
        client.applyThemePatch({
          expectedRevision: initial.revision,
          expectedDataGeneration: initial.dataGeneration,
          files: [
            { operation: 'write', path: 'home.hbs', content: '<main>Home would pass</main>' },
            { operation: 'write', path: 'post.hbs', content: '{{> missing_canvas_partial}}' },
          ],
          settings: { 'global.accent_color': '#123456' },
        }),
      ).rejects.toThrow(/post/i);
      const retained = await client.render();
      expect(retained.revision).toBe(initial.revision);
      expect(retained.html.home).not.toContain('Home would pass');
      expect(retained.html.post).toBe(initial.html.post);
      expect(retained.html.home).not.toContain('#123456');
      expect(retained.workspaceId).toBe(initial.workspaceId);
    } finally {
      client.dispose();
    }
  },
);

it('reuses accepted render evidence for a no-op patch and rejects a racing obsolete patch', async () => {
  const client = new FixtureClient('source');
  try {
    const initial = await client.render();
    const same = await client.applyThemePatch({
      expectedRevision: initial.revision,
      expectedDataGeneration: initial.dataGeneration,
      files: [],
    });
    expect(same.unchanged).toBe(true);
    expect(same.renderKey).toBe(initial.renderKey);
    expect(same.editMarkerAttribute).toBe(initial.editMarkerAttribute);
    const make = (text: string) =>
      client.applyThemePatch({
        expectedRevision: initial.revision,
        expectedDataGeneration: initial.dataGeneration,
        files: [{ operation: 'write' as const, path: 'home.hbs', content: `<main>${text}</main>` }],
      });
    const results = await Promise.allSettled([make('First'), make('Second')]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect((await client.render()).html.home).toContain('First');
    expect((await client.render()).html.home).not.toContain('Second');
  } finally {
    client.dispose();
  }
});
