import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createUrlUtils } from '../../src/seam/url-utils.ts';

// Expected values adapted from @tryghost/url-utils test suite behavior
// (TryGhost/SDK packages/url-utils) — characterization of the copied subset.
describe('seam: url-utils', function () {
  const urlUtils = createUrlUtils({
    getSiteUrl: () => 'http://localhost:2368/',
    getAdminUrl: () => undefined,
  });

  it('urlJoin joins parts with single slashes', function () {
    assert.equal(
      urlUtils.urlJoin('http://localhost:2368/', '/assets/', '/css/screen.css'),
      'http://localhost:2368/assets/css/screen.css',
    );
    assert.equal(urlUtils.urlJoin('/', 'welcome', '/'), '/welcome/');
  });

  it('createUrl handles relative and absolute urls', function () {
    assert.equal(urlUtils.createUrl('/welcome-to-ghost/'), '/welcome-to-ghost/');
    assert.equal(urlUtils.createUrl('/', true), 'http://localhost:2368/');
  });

  it('urlFor home', function () {
    assert.equal(urlUtils.urlFor('home', true), 'http://localhost:2368/');
    assert.equal(urlUtils.urlFor('home', { trailingSlash: false }, true), 'http://localhost:2368');
  });

  it('urlFor relativeUrl object', function () {
    assert.equal(urlUtils.urlFor({ relativeUrl: '/about/' }), '/about/');
    assert.equal(
      urlUtils.urlFor({ relativeUrl: '/about/' }, null, true),
      'http://localhost:2368/about/',
    );
  });

  it('urlFor passes through absolute/external urls', function () {
    assert.equal(
      urlUtils.urlFor({ relativeUrl: 'https://example.com/x/' }),
      'https://example.com/x/',
    );
  });

  it('urlFor api', function () {
    assert.equal(
      urlUtils.urlFor('api', { type: 'content' }, true),
      'http://localhost:2368/ghost/api/content/',
    );
  });

  it('urlFor admin', function () {
    assert.equal(urlUtils.urlFor('admin', true), 'http://localhost:2368/ghost/');
  });

  it('urlFor image', function () {
    assert.equal(
      urlUtils.urlFor('image', { image: '/content/images/2020/01/foo.jpg' }, true),
      'http://localhost:2368/content/images/2020/01/foo.jpg',
    );
    assert.equal(
      urlUtils.urlFor('image', { image: '/content/images/2020/01/foo.jpg' }),
      '/content/images/2020/01/foo.jpg',
    );
  });

  it('absoluteToRelative strips the origin', function () {
    assert.equal(urlUtils.absoluteToRelative('http://localhost:2368/welcome/'), '/welcome/');
    assert.equal(
      urlUtils.absoluteToRelative('https://other.com/welcome/'),
      'https://other.com/welcome/',
    );
  });

  it('relativeToAbsolute adds the origin', function () {
    assert.equal(urlUtils.relativeToAbsolute('/welcome/'), 'http://localhost:2368/welcome/');
    assert.equal(urlUtils.relativeToAbsolute('https://other.com/x/'), 'https://other.com/x/');
  });

  it('replacePermalink substitutes route segments', function () {
    const result = urlUtils.replacePermalink('/:year/:slug/', {
      slug: 'my-post',
      published_at: new Date('2024-02-03T12:00:00Z'),
    });
    assert.equal(result, '/2024/my-post/');
  });

  it('honours subdirectory config', function () {
    const subdirUtils = createUrlUtils({ getSiteUrl: () => 'http://localhost:2368/blog/' });
    assert.equal(subdirUtils.getSubdir(), '/blog');
    assert.equal(subdirUtils.createUrl('/welcome/'), '/blog/welcome/');
    assert.equal(subdirUtils.urlFor('home', true), 'http://localhost:2368/blog/');
    assert.equal(
      subdirUtils.absoluteToRelative('http://localhost:2368/blog/welcome/'),
      '/blog/welcome/',
    );
    assert.equal(
      subdirUtils.absoluteToRelative('http://localhost:2368/blog/welcome/', {
        withoutSubdirectory: true,
      }),
      '/welcome/',
    );
  });
});
