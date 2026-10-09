import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { compareManifests } from '../../src/manifest/index.ts';
import { manifest, manifestOf, options } from './helpers.ts';

const approved = manifestOf(manifest());

/** A manifest as the site holds it, read from the test options' address. */
const version = (parsed: typeof approved, manifestUrl = options.manifestUrl) => ({
  manifestUrl,
  manifest: parsed,
});

function compareWith(overrides: Record<string, unknown>, parseOptions = options) {
  return compareManifests(
    version(approved),
    version(manifestOf(manifest(overrides), parseOptions), parseOptions.manifestUrl),
  );
}

describe('compareManifests', function () {
  it('finds nothing to approve when nothing changed', function () {
    assert.deepEqual(compareWith({}), { changes: [], requiresApproval: false });
  });

  it('lets the description and accent colour change silently', function () {
    assert.deepEqual(compareWith({ description: 'New words.', accent_color: '#000000' }), {
      changes: [
        { path: 'accent_color', requiresApproval: false },
        { path: 'description', requiresApproval: false },
      ],
      requiresApproval: false,
    });
  });

  it('lets a built-in icon change silently', function () {
    const before = manifestOf(manifest({ icon: { name: 'mic' } }));
    const after = manifestOf(manifest({ icon: { name: 'radio' } }));

    assert.equal(compareManifests(version(before), version(after)).requiresApproval, false);
  });

  it('needs approval for a new name or author', function () {
    assert.deepEqual(compareWith({ name: 'Podcasts' }).changes, [
      { path: 'name', requiresApproval: true },
    ]);
    assert.equal(
      compareWith({ author: { name: 'Example Audio', url: 'https://example.com/team' } })
        .requiresApproval,
      true,
    );
  });

  it('needs approval for any change to a URL, even its path', function () {
    assert.deepEqual(compareWith({ surfaces: [{ type: 'admin_page', url: '/dashboard' }] }), {
      changes: [{ path: 'surfaces[0].url', requiresApproval: true }],
      requiresApproval: true,
    });
    assert.equal(compareWith({ icon: { url: '/icon-2.svg' } }).requiresApproval, true);
  });

  it('needs approval when an app is served from somewhere new', function () {
    const moved = compareWith({}, { ...options, manifestUrl: 'https://new.example.com/app.json' });

    assert.deepEqual(moved.changes, [
      { path: 'manifest_url', requiresApproval: true },
      { path: 'icon.url', requiresApproval: true },
      { path: 'surfaces[0].url', requiresApproval: true },
    ]);
  });

  it('needs approval for a move even when nothing inside the manifest changes', function () {
    const absolute = manifestOf(
      manifest({
        icon: { url: 'https://cdn.example.net/icon.svg' },
        surfaces: [{ type: 'admin_page', url: 'https://app.example.net/ghost' }],
      }),
    );

    const moved = compareManifests(
      version(absolute),
      version(absolute, 'https://new.example.com/app.json'),
    );

    assert.deepEqual(moved, {
      changes: [{ path: 'manifest_url', requiresApproval: true }],
      requiresApproval: true,
    });
  });

  it('needs approval when a surface is added or removed', function () {
    // Every v0 manifest has exactly one surface, so build the other side by hand.
    const withoutSurfaces = { ...approved, surfaces: [] };

    assert.equal(
      compareManifests(version(withoutSurfaces), version(approved)).requiresApproval,
      true,
    );
    assert.equal(
      compareManifests(version(approved), version(withoutSurfaces)).requiresApproval,
      true,
    );
  });

  it('counts an empty list appearing as a change', function () {
    // A field added later starts out empty more often than not.
    const withCards = { ...approved, cards: [] } as unknown as typeof approved;

    assert.deepEqual(compareManifests(version(approved), version(withCards)).changes, [
      { path: 'cards', requiresApproval: true },
    ]);
  });

  it('needs approval when a built-in icon is swapped for one the app serves', function () {
    const before = manifestOf(manifest({ icon: { name: 'mic' } }));

    assert.deepEqual(compareManifests(version(before), version(approved)).changes, [
      { path: 'icon.name', requiresApproval: false },
      { path: 'icon.url', requiresApproval: true },
    ]);
  });
});
