/* eslint-disable @typescript-eslint/no-explicit-any */
// Smoke tests for {{ghost_head}} / {{ghost_foot}} — mock seam, assert key tags
// present. Structure adapted from ghost/core/test/unit/frontend/helpers/ghost-head.test.js.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';
import {
  SITE_URL,
  configureTestDeps,
  createHbsResponse,
  teardownTestDeps,
} from '../utils/renderer-test-utils.ts';
import ghostHead, { escapeJsonLd } from '../../src/helpers/ghost-head.ts';
import ghostFoot from '../../src/helpers/ghost-foot.ts';

function headOptions({
  renderObject = {},
  context = ['home'],
  settings = {},
  hash = {},
}: any = {}) {
  void settings;
  return {
    ...createHbsResponse({
      renderObject: { relativeUrl: '/', ...renderObject },
      templateOptions: { site: { accent_color: '#FF1A75' } },
      locals: {
        context,
        safeVersion: '6.0',
      },
    }),
    hash,
  };
}

afterEach(function () {
  teardownTestDeps();
});

describe('{{ghost_head}}', function () {
  beforeEach(function () {
    configureTestDeps({
      config: {
        portal: { url: 'https://cdn.example/portal@{version}/umd/portal.min.js', version: '2.51' },
        sodoSearch: {
          url: 'https://cdn.example/sodo-search@{version}/umd/sodo-search.min.js',
          version: '1.7',
          styles: 'https://cdn.example/sodo-search@{version}/umd/main.css',
        },
      },
    });
  });

  it('renders the home head with meta, canonical, structured data and schema', async function () {
    const result = await ghostHead(headOptions());
    const head = result!.toString();

    assert.match(head, /<meta name="description" content="Thoughts, stories and ideas\."/);
    assert.match(head, new RegExp(`<link rel="canonical" href="${SITE_URL}">`));
    assert.match(head, /<meta name="referrer" content="no-referrer-when-downgrade">/);
    assert.match(head, /<meta name="generator" content="Ghost 6.0">/);
    assert.match(
      head,
      new RegExp(
        `<link rel="alternate" type="application/rss\\+xml" title="Ghost" href="${SITE_URL}rss/">`,
      ),
    );
    assert.match(head, /<meta property="og:site_name" content="Ghost">/);
    assert.match(head, /<meta property="og:type" content="website">/);
    assert.match(head, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(head, /<script type="application\/ld\+json">/);
    assert.match(head, /"@type": "WebSite"/);
    // portal script with content api attributes
    assert.match(
      head,
      /<script defer src="https:\/\/cdn.example\/portal@2.51\/umd\/portal.min.js"/,
    );
    assert.match(head, new RegExp(`data-api="${SITE_URL}ghost/api/content/"`));
    assert.match(head, /data-key="testkey"/);
    // members CTA styles + accent color custom property
    assert.match(head, /<style id="gh-members-styles">/);
    assert.match(head, /--ghost-accent-color: #FF1A75/);
    // sodo-search script
    assert.match(head, /sodo-search@1.7/);
    // webmention discovery
    assert.match(
      head,
      new RegExp(`<link href="${SITE_URL}webmentions/receive/" rel="webmention">`),
    );
    // card assets (stubbed hasFile → true) with the constant asset hash
    assert.match(head, /<script defer src="\/public\/cards.min.js\?v=themerender"><\/script>/);
    assert.match(
      head,
      /<link rel="stylesheet" type="text\/css" href="\/public\/cards.min.css\?v=themerender">/,
    );
  });

  it('renders post head with article og:type and canonical from the serializer url', async function () {
    const post = {
      title: 'Welcome',
      slug: 'welcome',
      html: '<p>hi</p>',
      url: `${SITE_URL}welcome/`,
      excerpt: 'The excerpt',
      custom_excerpt: 'The excerpt',
      published_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-11T00:00:00.000Z',
      primary_author: { name: 'Cameron', slug: 'cameron', url: `${SITE_URL}author/cameron/` },
      authors: [{ name: 'Cameron', slug: 'cameron' }],
      tags: [{ name: 'News', slug: 'news', visibility: 'public' }],
    };
    const result = await ghostHead(
      headOptions({
        renderObject: { post, relativeUrl: '/welcome/' },
        context: ['post'],
      }),
    );
    const head = result!.toString();

    assert.match(head, /<meta name="description" content="The excerpt">/);
    assert.match(head, new RegExp(`<link rel="canonical" href="${SITE_URL}welcome/">`));
    assert.match(head, /<meta property="og:type" content="article">/);
    assert.match(
      head,
      /<meta property="article:published_time" content="2024-01-10T00:00:00.000Z">/,
    );
    assert.match(head, /<meta property="article:tag" content="News">/);
    assert.match(head, /"@type": "Article"/);
    assert.match(head, /<meta name="twitter:label1" content="Written by">/);
    assert.match(head, /<meta name="twitter:data1" content="Cameron">/);
  });

  it('degrades gracefully when non-public settings are absent (deltas)', async function () {
    // announcement_*, heading_font/body_font, members_track_sources are
    // undefined in the Content API snapshot — the sections are omitted.
    const result = await ghostHead(headOptions());
    const head = result!.toString();

    assert.doesNotMatch(head, /announcement-bar/);
    assert.doesNotMatch(head, /member-attribution/);
    assert.doesNotMatch(head, /@font-face/);
  });

  it('respects the exclude hash', async function () {
    const result = await ghostHead(
      headOptions({ hash: { exclude: 'metadata,card_assets,search' } }),
    );
    const head = result!.toString();

    assert.doesNotMatch(head, /<meta name="description"/);
    assert.doesNotMatch(head, /cards.min.js/);
    assert.doesNotMatch(head, /sodo-search/);
    // non-excluded parts still render
    assert.match(head, /<meta name="generator" content="Ghost 6.0">/);
  });

  it('injects global and post codeinjection', async function () {
    teardownTestDeps();
    configureTestDeps({ settingsOverrides: { codeinjection_head: '<style>.global {}</style>' } });
    const post = {
      title: 'Welcome',
      slug: 'welcome',
      html: '',
      url: `${SITE_URL}welcome/`,
      codeinjection_head: '<style>.post {}</style>',
      primary_author: { name: 'C', slug: 'c' },
    };
    const result = await ghostHead(
      headOptions({ renderObject: { post, relativeUrl: '/welcome/' }, context: ['post'] }),
    );
    const head = result!.toString();

    assert.match(head, /<style>\.global \{\}<\/style>/);
    assert.match(head, /<style>\.post \{\}<\/style>/);
  });

  it('returns nothing for 5xx error pages', async function () {
    const options = headOptions({ renderObject: { statusCode: 503 } });
    const result = await ghostHead(options);
    assert.equal(result, undefined);
  });
});

describe('escapeJsonLd', function () {
  it('escapes script-breakout characters as JSON unicode escapes', function () {
    const json = JSON.stringify({ headline: '</script><script>alert(1)</script>' });
    const escaped = escapeJsonLd(json);
    assert.doesNotMatch(escaped, /<\/script>/);
    assert.deepEqual(JSON.parse(escaped), JSON.parse(json));
  });
});

describe('{{ghost_foot}}', function () {
  it('outputs global codeinjection', function () {
    configureTestDeps({
      settingsOverrides: { codeinjection_foot: '<script>window.foot = true;</script>' },
    });
    const result = ghostFoot(createHbsResponse({ locals: {} }));
    assert.equal(result.toString(), '<script>window.foot = true;</script>');
  });

  it('combines global, post and tag codeinjection', function () {
    configureTestDeps({ settingsOverrides: { codeinjection_foot: '<x>' } });
    const options = createHbsResponse({
      renderObject: {
        post: { codeinjection_foot: '<y>' },
      },
      locals: {},
    });
    const result = ghostFoot(options);
    assert.equal(result.toString(), '<x> <y>');
  });

  it('is empty without codeinjection', function () {
    configureTestDeps();
    const result = ghostFoot(createHbsResponse({ locals: {} }));
    assert.equal(result.toString(), '');
  });
});
