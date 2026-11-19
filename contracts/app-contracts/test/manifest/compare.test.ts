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

describe('compareManifests, for access', function () {
  const POSTS = {
    post: {
      scopes: [{ permission_key: 'post:browse' }, { permission_key: 'post:read', backend: true }],
    },
  };
  const before = manifestOf(manifest({ access: POSTS }));
  const withAccess = (access: unknown) =>
    compareManifests(before, manifestOf(manifest({ access })));

  it('needs approval for a new scope, under a resource already declared or a new one', function () {
    assert.deepEqual(
      withAccess({
        post: { scopes: [...POSTS.post.scopes, { permission_key: 'post:edit' }] },
        tag: { scopes: [{ permission_key: 'tag:browse' }] },
      }),
      {
        changes: [
          { kind: 'access', scope: 'post:edit', change: 'added', backend: false },
          { kind: 'access', scope: 'tag:browse', change: 'added', backend: false },
        ],
        requiresApproval: true,
      },
    );
  });

  it('needs approval for a scope newly marked for the backend', function () {
    assert.deepEqual(
      withAccess({
        post: {
          scopes: [
            { permission_key: 'post:browse', backend: true },
            { permission_key: 'post:read', backend: true },
          ],
        },
      }),
      {
        changes: [{ kind: 'access', scope: 'post:browse', change: 'backend_added', backend: true }],
        requiresApproval: true,
      },
    );
  });

  it('narrows access at once when a scope or resource goes, or backend is turned off', function () {
    assert.deepEqual(withAccess({ post: { scopes: [{ permission_key: 'post:browse' }] } }), {
      changes: [{ kind: 'access', scope: 'post:read', change: 'removed', backend: true }],
      requiresApproval: false,
    });
    assert.equal(withAccess({}).requiresApproval, false);
    assert.deepEqual(
      withAccess({
        post: { scopes: [{ permission_key: 'post:browse' }, { permission_key: 'post:read' }] },
      }),
      {
        changes: [
          { kind: 'access', scope: 'post:read', change: 'backend_removed', backend: false },
        ],
        requiresApproval: false,
      },
    );
  });

  it('finds no change when only the order differs', function () {
    assert.deepEqual(
      withAccess({
        post: {
          scopes: [
            { permission_key: 'post:read', backend: true },
            { permission_key: 'post:browse' },
          ],
        },
      }),
      { changes: [], requiresApproval: false },
    );
    const two = manifestOf(
      manifest({
        access: { ...POSTS, slug: { scopes: [{ permission_key: 'slug:generate' }] } },
      }),
    );
    const swapped = manifestOf(
      manifest({
        access: { slug: { scopes: [{ permission_key: 'slug:generate' }] }, ...POSTS },
      }),
    );
    assert.deepEqual(compareManifests(two, swapped).changes, []);
  });

  it('lists field changes by path, then access changes in the registry’s order', function () {
    assert.deepEqual(
      compareManifests(
        before,
        manifestOf(manifest({ access: {}, name: 'Podcasts', accent_color: '#000000' })),
      ).changes,
      [
        { kind: 'field', path: 'accent_color', requires_approval: false },
        { kind: 'field', path: 'name', requires_approval: true },
        { kind: 'access', scope: 'post:browse', change: 'removed', backend: false },
        { kind: 'access', scope: 'post:read', change: 'removed', backend: true },
      ],
    );
  });

  it('adds every scope and changes no field without an approved manifest, as at install', function () {
    assert.deepEqual(compareManifests(undefined, before), {
      changes: [
        { kind: 'access', scope: 'post:browse', change: 'added', backend: false },
        { kind: 'access', scope: 'post:read', change: 'added', backend: true },
      ],
      requiresApproval: true,
    });
    assert.deepEqual(compareManifests(undefined, approved), {
      changes: [],
      requiresApproval: false,
    });
  });
});
