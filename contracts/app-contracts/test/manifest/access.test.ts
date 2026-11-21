import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import {
  approvedScopes,
  compareAccess,
  describeAccess,
  describeScopes,
  widensAccess,
  type AppAccess,
  type AppAccessSource,
} from '../../src/manifest/access.ts';
import { AppAccessSchema } from '../../src/manifest/access-schema.ts';

describe('describeScopes', () => {
  it('gives one line per resource, with each scope’s wording on its own', () => {
    expect(
      describeScopes(['tag:edit', 'post:read', 'tag:browse', 'post:destroy', 'slug:generate']),
    ).toEqual([
      {
        resource: 'post',
        title: 'Posts and pages',
        actions: ['Read any post or page.', 'Delete posts and pages.'],
        scopes: ['post:read', 'post:destroy'],
      },
      {
        resource: 'tag',
        title: 'Tags',
        actions: ['List and search tags.', 'Edit tags.'],
        scopes: ['tag:browse', 'tag:edit'],
      },
      {
        resource: 'slug',
        title: 'URL slugs',
        actions: ['Ask Ghost for an unused URL slug.'],
        scopes: ['slug:generate'],
      },
    ]);
  });

  it('says that creating a post can publish it, choose who reads it and create tags', () => {
    expect(describeScopes(['post:add'])[0]?.actions).toEqual([
      'Create posts and pages, including published ones, choose who can read them and their authors, and create tags for them.',
    ]);
  });

  it('is empty for no scopes', () => {
    expect(describeScopes([])).toEqual([]);
  });
});

describe('describeAccess', () => {
  it('describes every scope, and the ones the backend may use apart', () => {
    const { lines, backendLines } = describeAccess([
      { permission_key: 'post:browse', backend: false },
      { permission_key: 'post:edit', backend: true },
      { permission_key: 'tag:browse', backend: false },
    ]);
    expect(lines).toEqual(describeScopes(['post:browse', 'post:edit', 'tag:browse']));
    expect(backendLines).toEqual(describeScopes(['post:edit']));
  });

  it('describes nothing for no access', () => {
    expect(describeAccess([])).toEqual({ lines: [], backendLines: [] });
  });
});

describe('approvedScopes', () => {
  it('grants every declared scope, whether or not the backend may use it', () => {
    expect([
      ...approvedScopes([
        { permission_key: 'post:read', backend: true },
        { permission_key: 'tag:browse', backend: false },
      ]),
    ]).toEqual(['post:read', 'tag:browse']);
  });
});

describe('widensAccess', () => {
  it('is true only for a new scope or one newly for the backend', () => {
    expect(
      (['added', 'backend_added', 'removed', 'backend_removed'] as const).map((change) =>
        widensAccess({ change }),
      ),
    ).toEqual([true, true, false, false]);
  });
});

describe('AppAccessSource', () => {
  it('takes only a resource’s own scopes', () => {
    const valid: AppAccessSource = {
      post: { scopes: [{ permission_key: 'post:edit', backend: true }] },
    };
    // @ts-expect-error A tag scope can't be listed under post.
    const misplaced: AppAccessSource = { post: { scopes: [{ permission_key: 'tag:edit' }] } };
    // @ts-expect-error Ghost has no such scope.
    const unknown: AppAccessSource = { post: { scopes: [{ permission_key: 'post:publish' }] } };
    expect([valid, misplaced, unknown]).toHaveLength(3);
  });

  it('matches what the schema reads and returns', () => {
    expectTypeOf<AppAccessSource>().toExtend<z.input<typeof AppAccessSchema>>();
    expectTypeOf<z.output<typeof AppAccessSchema>>().toExtend<AppAccess>();
  });
});

describe('compareAccess', () => {
  it('treats every scope as new without an earlier version', () => {
    expect(compareAccess(undefined, [{ permission_key: 'post:read', backend: true }])).toEqual([
      {
        kind: 'access',
        scope: 'post:read',
        change: 'added',
        backend: true,
      },
    ]);
  });

  it('reports each scope added, removed, or newly or no longer for the backend', () => {
    expect(
      compareAccess(
        [
          { permission_key: 'post:browse', backend: false },
          { permission_key: 'post:read', backend: true },
          { permission_key: 'post:edit', backend: true },
          { permission_key: 'tag:browse', backend: false },
        ],
        [
          { permission_key: 'post:edit', backend: false },
          { permission_key: 'post:browse', backend: true },
          { permission_key: 'post:add', backend: false },
        ],
      ),
    ).toEqual([
      {
        kind: 'access',
        scope: 'post:browse',
        change: 'backend_added',
        backend: true,
      },
      {
        kind: 'access',
        scope: 'post:read',
        change: 'removed',
        backend: true,
      },
      {
        kind: 'access',
        scope: 'post:add',
        change: 'added',
        backend: false,
      },
      {
        kind: 'access',
        scope: 'post:edit',
        change: 'backend_removed',
        backend: false,
      },
      {
        kind: 'access',
        scope: 'tag:browse',
        change: 'removed',
        backend: false,
      },
    ]);
  });
});
