import { describe, expect, it } from 'vitest';

import { describeScopes } from '../../src/manifest/access.ts';

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
