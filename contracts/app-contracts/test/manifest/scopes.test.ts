import { describe, expect, it } from 'vitest';

import {
  approvedScopes,
  compareScopes,
  describeScopes,
  widensAccess,
} from '../../src/manifest/scopes.ts';

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

describe('approvedScopes', () => {
  it('grants every scope the manifest lists', () => {
    expect([...approvedScopes(['post:read', 'tag:browse'])]).toEqual(['post:read', 'tag:browse']);
  });
});

describe('widensAccess', () => {
  it('is true only for a new scope', () => {
    expect((['added', 'removed'] as const).map((change) => widensAccess({ change }))).toEqual([
      true,
      false,
    ]);
  });
});

describe('compareScopes', () => {
  it('treats every scope as new without an earlier version', () => {
    expect(compareScopes(undefined, ['post:read'])).toEqual([
      { kind: 'scope', scope: 'post:read', change: 'added' },
    ]);
  });

  it('reports each scope added or removed, in the registry’s order', () => {
    expect(
      compareScopes(
        ['post:browse', 'post:read', 'post:edit', 'tag:browse'],
        ['post:edit', 'post:browse', 'post:add'],
      ),
    ).toEqual([
      { kind: 'scope', scope: 'post:read', change: 'removed' },
      { kind: 'scope', scope: 'post:add', change: 'added' },
      { kind: 'scope', scope: 'tag:browse', change: 'removed' },
    ]);
  });

  it('finds nothing when only the order changed', () => {
    expect(compareScopes(['post:edit', 'post:browse'], ['post:browse', 'post:edit'])).toEqual([]);
  });
});
