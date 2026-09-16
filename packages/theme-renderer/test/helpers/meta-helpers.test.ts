// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/{meta_title,meta_description}.test.js
// and test/unit/frontend/meta behavior.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';
import {
  SITE_URL,
  configureTestDeps,
  createHbsResponse,
  teardownTestDeps,
} from '../utils/renderer-test-utils.ts';
import metaTitle from '../../src/helpers/meta-title.ts';
import metaDescription from '../../src/helpers/meta-description.ts';
import getMetaData from '../../src/meta/get-meta.ts';

beforeEach(function () {
  configureTestDeps();
});

afterEach(function () {
  teardownTestDeps();
});

describe('{{meta_title}}', function () {
  it('site title on home', function () {
    const options = createHbsResponse({ locals: { context: ['home'] } });
    assert.equal(metaTitle.call({}, options), 'Ghost');
  });

  it('post title on posts', function () {
    const renderObject = { post: { title: 'Post Title' } };
    const options = createHbsResponse({
      renderObject,
      locals: { context: ['post'] },
    });
    assert.equal(metaTitle.call(renderObject, options), 'Post Title');
  });

  it('prefers post meta_title', function () {
    const renderObject = { post: { title: 'Post Title', meta_title: 'SEO Title' } };
    const options = createHbsResponse({
      renderObject,
      locals: { context: ['post'] },
    });
    assert.equal(metaTitle.call(renderObject, options), 'SEO Title');
  });

  it('tag pages append the site title', function () {
    const renderObject = { tag: { name: 'Rasper Red' } };
    const options = createHbsResponse({
      renderObject,
      locals: { context: ['tag'] },
    });
    assert.equal(metaTitle.call(renderObject, options), 'Rasper Red - Ghost');
  });

  it('paged contexts include the page number', function () {
    const renderObject = {
      tag: { name: 'Rasper Red' },
      pagination: { total: 2, page: 2 },
    };
    const options = createHbsResponse({
      renderObject,
      locals: { context: ['tag', 'paged'] },
    });
    assert.equal(metaTitle.call(renderObject, options), 'Rasper Red - Ghost (Page 2)');
  });
});

describe('{{meta_description}}', function () {
  it('site description on home', function () {
    const options = createHbsResponse({ locals: { context: ['home'] } });
    assert.equal(metaDescription.call({}, options), 'Thoughts, stories and ideas.');
  });

  it('empty for posts without custom excerpt or meta description', function () {
    const options = createHbsResponse({
      renderObject: { post: { title: 'Post', excerpt: 'auto excerpt' } },
      locals: { context: ['post'] },
    });
    assert.equal(metaDescription.call({}, options), '');
  });

  it('post meta_description when set', function () {
    const renderObject = { post: { title: 'Post', meta_description: 'Describe me' } };
    const options = createHbsResponse({
      renderObject,
      locals: { context: ['post'] },
    });
    assert.equal(metaDescription.call(renderObject, options), 'Describe me');
  });
});

describe('getMetaData (meta layer smoke)', function () {
  it('composes site + post meta for a post context', async function () {
    const post = {
      title: 'Welcome',
      slug: 'welcome',
      html: '<p>hi</p>',
      url: `${SITE_URL}welcome/`,
      excerpt: 'The excerpt',
      feature_image: `${SITE_URL}content/images/2024/01/feature.png`,
      published_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-11T00:00:00.000Z',
      primary_author: { name: 'Cameron', slug: 'cameron', url: `${SITE_URL}author/cameron/` },
      tags: [{ name: 'News', slug: 'news', visibility: 'public' }],
    };
    const data = {
      post,
      relativeUrl: '/welcome/',
      context: ['post'],
    };

    const meta = await getMetaData(data, data);

    assert.equal(meta.url, `${SITE_URL}welcome/`);
    assert.equal(meta.canonicalUrl, `${SITE_URL}welcome/`);
    assert.equal(meta.metaTitle, 'Welcome');
    assert.equal(meta.rssUrl, `${SITE_URL}rss/`);
    assert.equal(meta.ogType, 'article');
    assert.equal(meta.authorName, 'Cameron');
    assert.equal(meta.authorUrl, `${SITE_URL}author/cameron/`);
    assert.deepEqual(meta.keywords, ['News']);
    assert.equal(meta.publishedDate, '2024-01-10T00:00:00.000Z');
    assert.equal(meta.modifiedDate, '2024-01-11T00:00:00.000Z');
    assert.equal(meta.coverImage.url, `${SITE_URL}content/images/2024/01/feature.png`);
    assert.equal(meta.site.title, 'Ghost');
    // structured data + schema composed after (stubbed) image dimensions
    assert.equal(meta.structuredData['og:title'], 'Welcome');
    assert.equal(meta.structuredData['twitter:card'], 'summary_large_image');
    assert.equal(meta.schema['@type'], 'Article');
    assert.equal(meta.schema.author.name, 'Cameron');
    // image dimension probing is stubbed → no dimensions attached (documented delta)
    assert.equal(meta.coverImage.dimensions, undefined);
  });
});
