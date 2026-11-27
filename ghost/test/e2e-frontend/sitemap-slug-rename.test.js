// A slug rename has to refresh the sitemap on its own, with no
// unrelated edit to nudge it. The chain: the edit handler sets
// `X-Cache-Invalidate: /*` dynamically (the endpoints' static `cacheInvalidate`
// config is `false`, so it covers none of this) → the emit-events middleware
// turns that header into `site.changed` → the sitemap index is invalidated and
// the next read rebuilds. Both ends are asserted, so a break at either one fails
// here rather than silently serving a stale sitemap.
const assert = require('node:assert/strict');
const { agentProvider, assertions, fixtureManager } = require('../utils/e2e-framework');
const { cacheInvalidateHeaderSetToWildcard } = assertions;

describe('Sitemap freshness', function () {
  let adminAgent;
  let frontendAgent;
  let ghostServer;

  async function getSitemap(path) {
    const res = await frontendAgent.get(path).expect(200);
    return res.text;
  }

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsWithFrontend();
    adminAgent = agents.adminAgent;
    frontendAgent = agents.frontendAgent;
    ghostServer = agents.ghostServer;

    await fixtureManager.init('posts');
    await adminAgent.loginAsOwner();
  });

  afterAll(async function () {
    // Optional-chained: a `beforeAll` that failed before the boot returned
    // would otherwise throw here and mask the real error, and the bound port
    // would leak to the next file sharing this fork.
    await ghostServer?.stop();
  });

  // The old-URL assertions below rely on the trailing slash: the renamed URL
  // still contains the old slug as a prefix, and only the `/` after it tells
  // `/tag/kitchen-sink/` apart from `/tag/kitchen-sink-renamed/`.
  it('serves the new URL in /sitemap-tags.xml after a tag slug rename', async function () {
    const { id, slug: oldSlug } = fixtureManager.get('tags', 0);
    const newSlug = `${oldSlug}-renamed`;

    assert.ok(
      (await getSitemap('/sitemap-tags.xml')).includes(`/tag/${oldSlug}/`),
      'precondition: sitemap should serve the original tag URL',
    );

    await adminAgent
      .put(`tags/${id}/`)
      .body({ tags: [{ slug: newSlug }] })
      .expectStatus(200)
      .expect(cacheInvalidateHeaderSetToWildcard());

    const sitemap = await getSitemap('/sitemap-tags.xml');
    assert.ok(sitemap.includes(`/tag/${newSlug}/`), 'sitemap should serve the renamed tag URL');
    assert.ok(
      !sitemap.includes(`/tag/${oldSlug}/`),
      'sitemap should not still serve the old tag URL',
    );
  });

  // Posts reach the sitemap through the collection router's permalink, the
  // other two through the taxonomy router and the author permalink.
  it('serves the new URL in /sitemap-posts.xml after a post slug rename', async function () {
    const {
      body: {
        posts: [post],
      },
    } = await adminAgent.get('posts/?filter=status:published&limit=1').expectStatus(200);
    const newSlug = `${post.slug}-renamed`;

    assert.ok(
      (await getSitemap('/sitemap-posts.xml')).includes(`/${post.slug}/`),
      'precondition: sitemap should serve the original post URL',
    );

    await adminAgent
      .put(`posts/${post.id}/`)
      .body({ posts: [{ slug: newSlug, updated_at: post.updated_at }] })
      .expectStatus(200)
      .expect(cacheInvalidateHeaderSetToWildcard());

    const sitemap = await getSitemap('/sitemap-posts.xml');
    assert.ok(sitemap.includes(`/${newSlug}/`), 'sitemap should serve the renamed post URL');
    assert.ok(
      !sitemap.includes(`/${post.slug}/`),
      'sitemap should not still serve the old post URL',
    );
  });

  it('serves the new URL in /sitemap-authors.xml after an author slug rename', async function () {
    // users[0] is the owner — the same user the suite authenticated as above.
    const { id, slug: oldSlug } = fixtureManager.get('users', 0);
    const newSlug = `${oldSlug}-renamed`;

    assert.ok(
      (await getSitemap('/sitemap-authors.xml')).includes(`/author/${oldSlug}/`),
      'precondition: sitemap should serve the original author URL',
    );

    await adminAgent
      .put(`users/${id}/`)
      .body({ users: [{ slug: newSlug }] })
      .expectStatus(200)
      .expect(cacheInvalidateHeaderSetToWildcard());

    const sitemap = await getSitemap('/sitemap-authors.xml');
    assert.ok(
      sitemap.includes(`/author/${newSlug}/`),
      'sitemap should serve the renamed author URL',
    );
    assert.ok(
      !sitemap.includes(`/author/${oldSlug}/`),
      'sitemap should not still serve the old author URL',
    );
  });
});
