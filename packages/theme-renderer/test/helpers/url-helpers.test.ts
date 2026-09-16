// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/{url,img_url,asset,page_url,tags,authors}.test.js
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';
import {
  SITE_URL,
  configureTestDeps,
  createHbsResponse,
  teardownTestDeps,
} from '../utils/renderer-test-utils.ts';

import url from '../../src/helpers/url.ts';
import imgUrl from '../../src/helpers/img-url.ts';
import asset from '../../src/helpers/asset.ts';
import pageUrl from '../../src/helpers/page-url.ts';
import tags from '../../src/helpers/tags.ts';
import authors from '../../src/helpers/authors.ts';
import date from '../../src/helpers/date.ts';

beforeEach(function () {
  configureTestDeps();
});

afterEach(function () {
  teardownTestDeps();
});

const post = {
  html: '<p>hi</p>',
  title: 'Welcome',
  slug: 'welcome',
  url: `${SITE_URL}welcome/`,
};

describe('{{url}}', function () {
  it('returns the relative post url from the serializer-attached url', function () {
    const result = url.call(post, createHbsResponse({}));
    assert.equal(result.toString(), '/welcome/');
  });

  it('returns the absolute url when requested', function () {
    const options = createHbsResponse({ hash: { absolute: 'true' } });
    const result = url.call(post, options);
    assert.equal(result.toString(), `${SITE_URL}welcome/`);
  });

  it('handles nav items', function () {
    const nav = { label: 'Home', url: '/', slug: 'home', current: true };
    const result = url.call(nav, createHbsResponse({}));
    assert.equal(result.toString(), '/');
  });
});

describe('{{img_url}}', function () {
  it('returns internal images relative', function () {
    const result = imgUrl.call({}, '/content/images/2024/01/pic.png', createHbsResponse({}));
    assert.equal(result, '/content/images/2024/01/pic.png');
  });

  it('returns absolute when requested', function () {
    const result = imgUrl.call(
      {},
      '/content/images/2024/01/pic.png',
      createHbsResponse({ hash: { absolute: 'true' } }),
    );
    assert.equal(result, `${SITE_URL}content/images/2024/01/pic.png`);
  });

  it('passes external images through', function () {
    const result = imgUrl.call({}, 'https://example.com/pic.png', createHbsResponse({}));
    assert.equal(result, 'https://example.com/pic.png');
  });

  it('applies size paths for internal images', function () {
    const options = createHbsResponse({
      templateOptions: { config: { image_sizes: { medium: { width: 600 } } } },
      hash: { size: 'medium' },
    });
    const result = imgUrl.call({}, '/content/images/2024/01/pic.png', options);
    assert.equal(result, '/content/images/size/w600/2024/01/pic.png');
  });

  it('adds sizes to unsplash images', function () {
    const options = createHbsResponse({
      templateOptions: { config: { image_sizes: { medium: { width: 600 } } } },
      hash: { size: 'medium' },
    });
    const result = imgUrl.call({}, 'https://images.unsplash.com/photo-123?ixlib=rb-4.0.3', options);
    assert.equal(result, 'https://images.unsplash.com/photo-123?ixlib=rb-4.0.3&w=600');
  });
});

describe('{{asset}}', function () {
  it('theme assets get /assets/ prefix and hash', function () {
    const result = asset('css/screen.css', { hash: {} });
    assert.equal(result.toString(), '/assets/css/screen.css?v=themerender');
  });

  it('public assets skip the /assets/ prefix', function () {
    const result = asset('public/cards.min.js', { hash: {} });
    assert.equal(result.toString(), '/public/cards.min.js?v=themerender');
  });

  it('min file replacement', function () {
    const result = asset('js/main.js', { hash: { hasMinFile: true } });
    assert.equal(result.toString(), '/assets/js/main.min.js?v=themerender');
  });

  it('favicon path is served without a hash', function () {
    const result = asset('favicon.ico', { hash: {} });
    assert.equal(result.toString(), '/favicon.ico');
  });
});

describe('{{page_url}}', function () {
  const pagedRoot = {
    relativeUrl: '/page/3/',
    pagination: { page: 3, pages: 4, next: 4, prev: 2, total: 40, limit: 10 },
  };

  it('next page url', function () {
    const options = createHbsResponse({ renderObject: pagedRoot });
    assert.equal(pageUrl('next', options), '/page/4/');
  });

  it('prev page url', function () {
    const options = createHbsResponse({ renderObject: pagedRoot });
    assert.equal(pageUrl('prev', options), '/page/2/');
  });

  it('numeric page url; page 1 is the root', function () {
    const options = createHbsResponse({ renderObject: pagedRoot });
    assert.equal(pageUrl(1, options), '/');
    assert.equal(pageUrl(2, options), '/page/2/');
  });
});

describe('{{tags}}', function () {
  it('autolinks tags using their urls', function () {
    const context = {
      tags: [
        { name: 'foo', slug: 'foo', url: `${SITE_URL}tag/foo/`, visibility: 'public' },
        { name: 'bar', slug: 'bar', url: `${SITE_URL}tag/bar/`, visibility: 'public' },
      ],
    };
    const result = tags.call(context, createHbsResponse({}));
    assert.equal(result.toString(), '<a href="/tag/foo/">foo</a>, <a href="/tag/bar/">bar</a>');
  });

  it('can disable autolink and change separator', function () {
    const context = {
      tags: [
        { name: 'foo', slug: 'foo', visibility: 'public' },
        { name: 'bar', slug: 'bar', visibility: 'public' },
      ],
    };
    const options = createHbsResponse({});
    options.hash = { autolink: 'false', separator: ' | ' };
    const result = tags.call(context, options);
    assert.equal(result.toString(), 'foo | bar');
  });
});

describe('{{authors}}', function () {
  it('autolinks authors', function () {
    const context = {
      authors: [
        {
          name: 'Cameron',
          slug: 'cameron',
          url: `${SITE_URL}author/cameron/`,
          visibility: 'public',
        },
      ],
    };
    const result = authors.call(context, createHbsResponse({}));
    assert.equal(result.toString(), '<a href="/author/cameron/">Cameron</a>');
  });
});

describe('{{date}}', function () {
  it('formats published_at with the site timezone', function () {
    const options = createHbsResponse({
      templateOptions: { site: { timezone: 'Etc/UTC', locale: 'en' } },
    });
    options.hash = { format: 'DD MM YYYY' };
    const result = date.call({ published_at: '2023-01-15T12:00:00.000Z' }, options);
    assert.equal(result.toString(), '15 01 2023');
  });

  it('formats an explicit date argument', function () {
    const options = createHbsResponse({
      templateOptions: { site: { timezone: 'Etc/UTC', locale: 'en' } },
    });
    options.hash = { format: 'YYYY' };
    const result = date.call({}, '2020-06-01T00:00:00.000Z', options);
    assert.equal(result.toString(), '2020');
  });
});
