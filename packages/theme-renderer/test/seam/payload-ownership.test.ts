/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The ContentApiPort OWNERSHIP CONTRACT (src/seam/types.ts) says every call
 * returns freshly-owned JSON, because the pipeline mutates payloads in place.
 * src/seam/payload-ownership.ts enforces it in dev/test: a port handing out
 * the same object reference twice fails loudly instead of silently rendering
 * data corrupted by the previous request. processQuery additionally owns its
 * (tiny) query argument via a shallow-safe clone, so caller-held query specs
 * cannot be corrupted across renders.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import fetchData from '../../src/data/fetch-data.ts';
import { configureTestDeps, teardownTestDeps } from '../utils/renderer-test-utils.ts';

afterEach(function () {
  teardownTestDeps();
});

function browsePayload() {
  return {
    posts: [{ id: 'p1', slug: 'welcome', title: 'Welcome' }],
    meta: { pagination: { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null } },
  };
}

describe('seam payload ownership assertion', function () {
  it('rejects the second fetch when the port returns the same payload object twice', async function () {
    const shared = browsePayload();
    const browseCalls: any[] = [];
    configureTestDeps({
      depsOverrides: {
        api: {
          postsPublic: {
            browse(options: any) {
              browseCalls.push(options);
              return Promise.resolve(shared);
            },
            read() {
              return Promise.resolve(shared);
            },
          },
        } as any,
      },
    });

    const routerOptions = {
      resourceType: 'posts',
      query: { controller: 'postsPublic', type: 'browse', resource: 'posts' },
    };

    // First render owns the payload...
    const first = await fetchData({}, routerOptions, { member: null });
    assert.equal(first, shared);

    // ...second hand-out of the SAME reference violates the contract
    await assert.rejects(fetchData({}, routerOptions, { member: null }), (err: any) => {
      assert.equal(err.errorType, 'IncorrectUsageError');
      assert.match(err.message, /same payload object twice/);
      return true;
    });
    assert.equal(browseCalls.length, 2);
  });

  it('accepts a well-behaved port returning fresh payloads per call, without query cross-render mutation', async function () {
    const browseOptions: any[] = [];
    const readOptions: any[] = [];
    configureTestDeps({
      depsOverrides: {
        api: {
          postsPublic: {
            browse(options: any) {
              browseOptions.push(options);
              return Promise.resolve(browsePayload());
            },
          },
          tagsPublic: {
            read(options: any) {
              readOptions.push(options);
              return Promise.resolve({ tags: [{ id: 't1', slug: 'news' }] });
            },
          },
        } as any,
      },
    });

    // Taxonomy-shaped routerOptions: the filter and the route data slug
    // both carry '%s' placeholders replaced per request in processQuery
    const routerOptions = {
      filter: "tags:'%s'+tags.visibility:public",
      resourceType: 'tags',
      data: { tag: { type: 'read', resource: 'tags', slug: '%s' } },
    };

    const first = await fetchData({ slug: 'news' }, routerOptions, { member: null });
    const second = await fetchData({ slug: 'sport' }, routerOptions, { member: null });

    assert.ok(first.data.tag);
    assert.ok(second.data.tag);
    // Each render saw its own slug — no %s-substitution leaked between
    // renders through a shared query object
    assert.equal(browseOptions[0].filter, "tags:'news'+tags.visibility:public");
    assert.equal(browseOptions[1].filter, "tags:'sport'+tags.visibility:public");
    assert.equal(readOptions[0].slug, 'news');
    assert.equal(readOptions[1].slug, 'sport');
    // The caller-held routerOptions spec keeps its placeholder untouched
    assert.equal(routerOptions.data.tag.slug, '%s');
    assert.equal(routerOptions.filter, "tags:'%s'+tags.visibility:public");
  });
});
