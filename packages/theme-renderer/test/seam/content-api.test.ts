import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createContentApi } from '../../src/seam/content-api.ts';

function fetchRecorder(body: unknown = { posts: [] }, status = 200) {
  const calls: string[] = [];
  const fetchImpl = (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
  return { calls, fetchImpl };
}

describe('seam: content-api', function () {
  it('maps browse options onto content API query params', async function () {
    const { calls, fetchImpl } = fetchRecorder();
    const api = createContentApi({
      siteUrl: 'http://localhost:2368/',
      key: 'k3y',
      fetch: fetchImpl,
    });

    await api.postsPublic.browse({
      include: 'authors,tags,tiers',
      filter: 'tag:getting-started',
      limit: 5,
      order: 'published_at desc',
      page: 2,
      context: { member: null },
    });

    assert.equal(calls.length, 1);
    const url = new URL(calls[0] as string);
    assert.equal(url.pathname, '/ghost/api/content/posts/');
    assert.equal(url.searchParams.get('key'), 'k3y');
    assert.equal(url.searchParams.get('include'), 'authors,tags,tiers');
    assert.equal(url.searchParams.get('filter'), 'tag:getting-started');
    assert.equal(url.searchParams.get('limit'), '5');
    assert.equal(url.searchParams.get('order'), 'published_at desc');
    assert.equal(url.searchParams.get('page'), '2');
    // in-process-only options never hit the wire
    assert.equal(url.searchParams.has('context'), false);
  });

  it('strips skipPagination (in-process only, used by prev_post)', async function () {
    const { calls, fetchImpl } = fetchRecorder();
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k', fetch: fetchImpl });

    await api.postsPublic.browse({ limit: 1, skipPagination: true });
    const url = new URL(calls[0] as string);
    assert.equal(url.searchParams.has('skipPagination'), false);
  });

  it('read({slug}) maps to /posts/slug/:slug/', async function () {
    const { calls, fetchImpl } = fetchRecorder({ posts: [{ slug: 'welcome' }] });
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k', fetch: fetchImpl });

    const result = await api.postsPublic.read({ slug: 'welcome', include: 'authors,tags,tiers' });
    const url = new URL(calls[0] as string);
    assert.equal(url.pathname, '/ghost/api/content/posts/slug/welcome/');
    assert.equal(url.searchParams.get('include'), 'authors,tags,tiers');
    assert.deepEqual(result.posts[0], { slug: 'welcome' });
  });

  it('read({id}) maps to /posts/:id/', async function () {
    const { calls, fetchImpl } = fetchRecorder({ posts: [] });
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k', fetch: fetchImpl });

    await api.pagesPublic.read({ id: 'abc123' });
    const url = new URL(calls[0] as string);
    assert.equal(url.pathname, '/ghost/api/content/pages/abc123/');
  });

  it('throws the API error message on failure', async function () {
    const { fetchImpl } = fetchRecorder(
      { errors: [{ message: 'Resource not found', type: 'NotFoundError' }] },
      404,
    );
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k', fetch: fetchImpl });

    await assert.rejects(api.tagsPublic.read({ slug: 'nope' }), /Resource not found/);
  });

  it('exposes all controllers fetch-data dispatches to', function () {
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k' });
    for (const controller of [
      'postsPublic',
      'pagesPublic',
      'tagsPublic',
      'authorsPublic',
      'tiersPublic',
      'newslettersPublic',
    ]) {
      assert.equal(typeof api[controller].browse, 'function', controller);
      assert.equal(typeof api[controller].read, 'function', controller);
    }
  });

  it('stubs member count history with zero totals', async function () {
    const api = createContentApi({ siteUrl: 'http://localhost:2368/', key: 'k' });
    const stats = await api.stats!.memberCountHistory.query();
    assert.deepEqual(stats.meta.totals, { free: 0, paid: 0, comped: 0, gift: 0 });
  });
});
