import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { compareManifests } from '../../src/manifest/index.ts';
import { manifest, manifestOf, options } from './helpers.ts';

const approved = manifestOf(manifest());

function compareWith(overrides: Record<string, unknown>, parseOptions = options) {
  return compareManifests(approved, manifestOf(manifest(overrides), parseOptions));
}

const OTHER_KEY = { kty: 'OKP', crv: 'Ed25519', x: 'Z_QKSqF5_5W5r2LfGwj1UyVOFyFew44-bMShKMwpCfo' };

describe('compareManifests', function () {
  it('finds nothing to approve when nothing changed', function () {
    assert.deepEqual(compareWith({}), { changes: [], requiresApproval: false });
  });

  it('lets the description and accent colour change silently', function () {
    assert.deepEqual(compareWith({ description: 'New words.', accent_color: '#000000' }), {
      changes: [
        { kind: 'field', path: 'accent_color', requires_approval: false },
        { kind: 'field', path: 'description', requires_approval: false },
      ],
      requiresApproval: false,
    });
  });

  it('lets a built-in icon change silently', function () {
    const before = manifestOf(manifest({ icon: { name: 'mic' } }));
    const after = manifestOf(manifest({ icon: { name: 'radio' } }));

    assert.equal(compareManifests(before, after).requiresApproval, false);
  });

  // The identity key vouches for it, so a leaked one can be replaced without a review.
  it('lets the backend key change silently', function () {
    assert.deepEqual(compareWith({ backend_key: OTHER_KEY }), {
      changes: [{ kind: 'field', path: 'backend_key.x', requires_approval: false }],
      requiresApproval: false,
    });
  });

  it('needs approval for a new identity key', function () {
    assert.deepEqual(compareWith({ identity_key: OTHER_KEY }).changes, [
      { kind: 'field', path: 'identity_key.x', requires_approval: true },
    ]);
  });

  it('needs approval to become, or stop being, a development build', function () {
    assert.deepEqual(compareWith({ development: true }), {
      changes: [{ kind: 'field', path: 'development', requires_approval: true }],
      requiresApproval: true,
    });
  });

  it('needs approval for a new name or author', function () {
    assert.deepEqual(compareWith({ name: 'Podcasts' }).changes, [
      { kind: 'field', path: 'name', requires_approval: true },
    ]);
    assert.equal(
      compareWith({ author: { name: 'Example Audio', url: 'https://example.com/team' } })
        .requiresApproval,
      true,
    );
  });

  it('needs approval for any change to a URL, even its path', function () {
    assert.deepEqual(
      compareWith({
        surfaces: [{ type: 'admin_page', url: '/dashboard' }],
      }),
      {
        changes: [{ kind: 'field', path: 'surfaces[0].url', requires_approval: true }],
        requiresApproval: true,
      },
    );
    assert.equal(compareWith({ icon: { url: '/icon-2.svg' } }).requiresApproval, true);
  });

  it('needs approval for a move even when nothing else in the manifest changes', function () {
    const manifestUrl = 'https://new.example.com/app.json';
    // Every path resolves against the manifest's address, so they all move with it.
    assert.deepEqual(compareWith({ manifest_url: manifestUrl }, { ...options, manifestUrl }), {
      changes: [
        { kind: 'field', path: 'icon.url', requires_approval: true },
        { kind: 'field', path: 'manifest_url', requires_approval: true },
        { kind: 'field', path: 'surfaces[0].url', requires_approval: true },
      ],
      requiresApproval: true,
    });
  });

  it('needs approval when a surface is added or removed', function () {
    // Every v0 manifest has exactly one surface, so build the other side by hand.
    const withoutSurfaces = { ...approved, surfaces: [] };

    assert.equal(compareManifests(withoutSurfaces, approved).requiresApproval, true);
    assert.equal(compareManifests(approved, withoutSurfaces).requiresApproval, true);
  });

  it('counts an empty list appearing as a change', function () {
    // A field added later starts out empty more often than not.
    const withCards = { ...approved, cards: [] } as unknown as typeof approved;

    assert.deepEqual(compareManifests(approved, withCards).changes, [
      { kind: 'field', path: 'cards', requires_approval: true },
    ]);
  });

  it('needs approval when a built-in icon is swapped for one the app serves', function () {
    const before = manifestOf(manifest({ icon: { name: 'mic' } }));

    assert.deepEqual(compareManifests(before, approved).changes, [
      { kind: 'field', path: 'icon.name', requires_approval: false },
      { kind: 'field', path: 'icon.url', requires_approval: true },
    ]);
  });
});

describe('compareManifests, for scopes', function () {
  const POSTS = ['post:browse', 'post:read'];
  const before = manifestOf(manifest({ scopes: POSTS }));
  const withScopes = (scopes: unknown) =>
    compareManifests(before, manifestOf(manifest({ scopes })));

  it('needs approval for a new scope', function () {
    assert.deepEqual(withScopes([...POSTS, 'post:edit', 'tag:browse']), {
      changes: [
        { kind: 'scope', scope: 'post:edit', change: 'added' },
        { kind: 'scope', scope: 'tag:browse', change: 'added' },
      ],
      requiresApproval: true,
    });
  });

  it('narrows access at once when a scope goes', function () {
    assert.deepEqual(withScopes(['post:browse']), {
      changes: [{ kind: 'scope', scope: 'post:read', change: 'removed' }],
      requiresApproval: false,
    });
    assert.equal(withScopes([]).requiresApproval, false);
  });

  it('finds no change when only the order differs', function () {
    assert.deepEqual(withScopes(['post:read', 'post:browse']), {
      changes: [],
      requiresApproval: false,
    });
  });

  it('lists field changes by path, then scope changes in the registry’s order', function () {
    assert.deepEqual(
      compareManifests(
        before,
        manifestOf(manifest({ scopes: [], name: 'Podcasts', accent_color: '#000000' })),
      ).changes,
      [
        { kind: 'field', path: 'accent_color', requires_approval: false },
        { kind: 'field', path: 'name', requires_approval: true },
        { kind: 'scope', scope: 'post:browse', change: 'removed' },
        { kind: 'scope', scope: 'post:read', change: 'removed' },
      ],
    );
  });

  it('adds every scope and changes no field without an approved manifest, as at install', function () {
    assert.deepEqual(compareManifests(undefined, before), {
      changes: [
        { kind: 'scope', scope: 'post:browse', change: 'added' },
        { kind: 'scope', scope: 'post:read', change: 'added' },
      ],
      requiresApproval: true,
    });
    assert.deepEqual(compareManifests(undefined, approved), {
      changes: [],
      requiresApproval: false,
    });
  });
});
