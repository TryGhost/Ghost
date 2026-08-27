const assert = require('node:assert/strict');
const {
  resolveApiCall,
  resolveRouteData,
  resolveResourceRead,
} = require('../../../../../core/frontend/services/routing/api-adapter');

describe('UNIT - services/routing/api-adapter', function () {
  describe('resolveApiCall - short form', function () {
    it('resolves tag shorthand to the public tags controller', function () {
      assert.deepEqual(resolveApiCall('tag.food'), {
        controller: 'tagsPublic',
        type: 'read',
        resource: 'tags',
        options: { slug: 'food', visibility: 'public' },
      });
    });

    it('resolves author shorthand', function () {
      assert.deepEqual(resolveApiCall('author.jane'), {
        controller: 'authorsPublic',
        type: 'read',
        resource: 'authors',
        options: { slug: 'jane' },
      });
    });

    it('resolves post shorthand', function () {
      assert.deepEqual(resolveApiCall('post.welcome'), {
        controller: 'postsPublic',
        type: 'read',
        resource: 'posts',
        options: { slug: 'welcome' },
      });
    });

    it('resolves page shorthand', function () {
      assert.deepEqual(resolveApiCall('page.about'), {
        controller: 'pagesPublic',
        type: 'read',
        resource: 'pages',
        options: { slug: 'about' },
      });
    });

    it('does not leak the slug into the shared resource config', function () {
      assert.equal(resolveApiCall('tag.first').options.slug, 'first');
      assert.equal(resolveApiCall('tag.second').options.slug, 'second');
    });

    it('throws for an unsupported shorthand resource', function () {
      assert.throws(() => resolveApiCall('unknown.thing'), /Unknown route data resource: unknown/);
    });
  });

  describe('resolveApiCall - long form read', function () {
    it('merges the resource default options', function () {
      assert.deepEqual(resolveApiCall({ type: 'read', resource: 'tags', slug: 'food' }), {
        controller: 'tagsPublic',
        type: 'read',
        resource: 'tags',
        options: { slug: 'food', visibility: 'public' },
      });
    });

    it('lets the entry override a default option', function () {
      assert.deepEqual(
        resolveApiCall({ type: 'read', resource: 'tags', slug: 'food', visibility: 'all' }),
        {
          controller: 'tagsPublic',
          type: 'read',
          resource: 'tags',
          options: { slug: 'food', visibility: 'all' },
        },
      );
    });

    it('keeps the redirect flag out of the API options', function () {
      const spec = resolveApiCall({
        type: 'read',
        resource: 'posts',
        slug: 'welcome',
        redirect: false,
      });

      assert.deepEqual(spec.options, { slug: 'welcome' });
    });
  });

  describe('resolveApiCall - long form browse', function () {
    it('resolves the posts browse a collection route runs by default', function () {
      // fetch-data's default post query is built from this spec.
      assert.deepEqual(resolveApiCall({ type: 'browse', resource: 'posts' }), {
        controller: 'postsPublic',
        type: 'browse',
        resource: 'posts',
        options: {},
      });
    });

    it('does not apply read defaults to a browse entry', function () {
      assert.deepEqual(resolveApiCall({ type: 'browse', resource: 'tags' }), {
        controller: 'tagsPublic',
        type: 'browse',
        resource: 'tags',
        options: {},
      });
    });

    it('passes the supported query options through', function () {
      const spec = resolveApiCall({
        type: 'browse',
        resource: 'posts',
        filter: 'featured:true',
        limit: 3,
        order: 'published_at desc',
        include: 'tags',
        visibility: 'public',
        status: 'published',
        page: 2,
      });

      assert.deepEqual(spec.options, {
        filter: 'featured:true',
        limit: 3,
        order: 'published_at desc',
        include: 'tags',
        visibility: 'public',
        status: 'published',
        page: 2,
      });
    });

    it('does not pass unsupported entry keys to the API', function () {
      // `fields` is accepted by the parser but has never been forwarded to
      // the Content API — preserved here so the behaviour stays explicit.
      const spec = resolveApiCall({ type: 'browse', resource: 'posts', fields: 'title' });

      assert.deepEqual(spec.options, {});
    });

    it('throws for an unsupported resource', function () {
      assert.throws(
        () => resolveApiCall({ type: 'browse', resource: 'widgets' }),
        /Unknown route data resource: widgets/,
      );
    });
  });

  describe('resolveRouteData', function () {
    it('returns an empty map when a route has no data', function () {
      assert.deepEqual(resolveRouteData(undefined), {});
    });

    it('keys top-level shorthand by its resource', function () {
      assert.deepEqual(resolveRouteData('tag.food'), {
        tag: {
          controller: 'tagsPublic',
          type: 'read',
          resource: 'tags',
          options: { slug: 'food', visibility: 'public' },
        },
      });
    });

    it('preserves the author-defined names of a data map', function () {
      const resolved = resolveRouteData({
        'my-tag': 'tag.food',
        featured: { type: 'browse', resource: 'posts', filter: 'featured:true' },
      });

      assert.deepEqual(Object.keys(resolved), ['my-tag', 'featured']);
      assert.equal(resolved['my-tag'].controller, 'tagsPublic');
      assert.equal(resolved.featured.options.filter, 'featured:true');
    });
  });

  describe('resolveResourceRead', function () {
    it('resolves shorthand to the long-form resource', function () {
      assert.deepEqual(resolveResourceRead('tag.food'), { resource: 'tags', slug: 'food' });
      assert.deepEqual(resolveResourceRead('author.jane'), { resource: 'authors', slug: 'jane' });
    });

    it('resolves a long form read', function () {
      assert.deepEqual(resolveResourceRead({ type: 'read', resource: 'pages', slug: 'about' }), {
        resource: 'pages',
        slug: 'about',
      });
    });

    it('a browse entry claims no resource', function () {
      assert.equal(
        resolveResourceRead({ type: 'browse', resource: 'posts', filter: 'featured:true' }),
        null,
      );
    });

    it('an unknown resource claims nothing rather than throwing', function () {
      // This runs on the request path, so an entry it cannot make sense of
      // must not take the page down.
      assert.equal(resolveResourceRead({ type: 'read', resource: 'widgets', slug: 'a' }), null);
      assert.equal(resolveResourceRead('unknown.thing'), null);
    });
  });
});
