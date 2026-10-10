import assert from 'node:assert/strict';
import {
  extractMetadata,
  getFaviconProbeUrls,
  isAmazonUrl,
  pickIcon,
} from '../../../../../core/server/services/oembed/extract-metadata';

const page = (head: string, body = '') => `<html><head>${head}</head><body>${body}</body></html>`;

describe('extractMetadata', function () {
  it('prefers Open Graph tags', function () {
    const metadata = extractMetadata(
      page(`
        <title>Document title</title>
        <meta property="og:title" content="OG title">
        <meta property="og:description" content="OG description">
        <meta property="og:site_name" content="Example Site">
        <meta property="og:image" content="/images/cover.jpg">
        <meta property="og:url" content="https://example.com/post/">
        <meta name="description" content="Meta description">
      `),
      'https://example.com/post/?ref=x',
    );

    assert.equal(metadata.title, 'OG title');
    assert.equal(metadata.description, 'OG description');
    assert.equal(metadata.publisher, 'Example Site');
    assert.equal(metadata.image, 'https://example.com/images/cover.jpg');
    assert.equal(metadata.url, 'https://example.com/post/');
  });

  it('falls back to the document title and input URL', function () {
    const metadata = extractMetadata(
      page('<title>  Just a\n  title </title>'),
      'https://example.com/a',
    );

    assert.equal(metadata.title, 'Just a title');
    assert.equal(metadata.url, 'https://example.com/a');
    assert.equal(metadata.description, null);
    assert.equal(metadata.author, null);
    assert.equal(metadata.image, null);
  });

  it('reads JSON-LD, including @graph entries and multiple authors', function () {
    const jsonld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: 'Headline &amp; more',
          author: [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }],
          publisher: { name: 'The Publisher' },
        },
      ],
    };
    const metadata = extractMetadata(
      page(`<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`),
      'https://example.com/post',
    );

    assert.equal(metadata.title, 'Headline & more');
    assert.equal(metadata.author, 'Ada Lovelace and Grace Hopper');
    assert.equal(metadata.publisher, 'The Publisher');
  });

  it('ignores invalid JSON-LD', function () {
    const metadata = extractMetadata(
      page('<title>Title</title><script type="application/ld+json">{nope</script>'),
      'https://example.com',
    );

    assert.equal(metadata.title, 'Title');
  });

  it('cleans up author names', function () {
    const byline = (author: string) =>
      extractMetadata(page(`<meta name="author" content="${author}">`), 'https://example.com')
        .author;

    assert.equal(byline('By  Jane Doe'), 'Jane Doe');
    assert.equal(byline('@janedoe'), 'janedoe');
    assert.equal(byline('https://example.com/jane'), null);
    assert.equal(byline('x'.repeat(129)), null);
  });

  it('skips byline elements holding dates', function () {
    const metadata = extractMetadata(
      page('', '<div class="byline">October 10, 2026</div><div class="byline">Jane Doe</div>'),
      'https://example.com',
    );

    assert.equal(metadata.author, 'Jane Doe');
  });

  it('derives the publisher from a separated title', function () {
    const metadata = extractMetadata(
      page('<title>Post title | Example Site</title>'),
      'https://example.com',
    );

    assert.equal(metadata.publisher, 'Example Site');
  });

  it('strips locations and normalizes ellipses in descriptions', function () {
    const metadata = extractMetadata(
      page('<meta name="description" content="LONDON — Something happened today...">'),
      'https://example.com',
    );

    assert.equal(metadata.description, 'Something happened today…');
  });

  it('ignores images inside noscript and media files', function () {
    const metadata = extractMetadata(
      page(
        '<meta property="og:image" content="https://example.com/video.mp4">',
        '<noscript><img src="https://tracker.example.com/pixel"></noscript><article><img src="/hero.png"></article>',
      ),
      'https://example.com/post',
    );

    assert.equal(metadata.image, 'https://example.com/hero.png');
  });

  it('only accepts http(s) URLs and drops utm parameters', function () {
    const metadata = extractMetadata(
      page(`
        <meta property="og:image" content="javascript:alert(1)">
        <meta name="twitter:image" content="https://example.com/a.png?utm_source=x&amp;w=200">
      `),
      'https://example.com',
    );

    assert.equal(metadata.image, 'https://example.com/a.png?w=200');
  });

  it('reads square JSON-LD logos', function () {
    const logo = (width: number, height: number) =>
      extractMetadata(
        page(
          `<script type="application/ld+json">${JSON.stringify({
            publisher: { logo: { url: 'https://example.com/logo.png', width, height } },
          })}</script>`,
        ),
        'https://example.com',
      ).logo;

    assert.equal(logo(60, 60), 'https://example.com/logo.png');
    assert.equal(logo(600, 60), null);
  });

  it('collects declared icons with their sizes', function () {
    const { icons } = extractMetadata(
      page(`
        <link rel="icon" href="/favicon-32x32.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple.png">
        <meta name="msapplication-TileImage" content="/tile.png">
        <meta name="msapplication-TileColor" content="#ffffff">
        <meta name="msapplication-config" content="/browserconfig.xml">
      `),
      'https://example.com/post',
    );

    assert.deepEqual(
      icons.map((icon) => [icon.url, icon.size.width]),
      [
        ['https://example.com/favicon-32x32.png', 32],
        ['https://example.com/apple.png', 180],
        ['https://example.com/tile.png', 0],
      ],
    );
  });

  it('applies Amazon product rules to Amazon URLs only', function () {
    const html = page(
      '<title>Amazon.com</title><meta property="og:site_name" content="Site">',
      '<span id="productTitle"> Product </span><img class="a-dynamic-image" src="/s.jpg" data-old-hires="/l.jpg">',
    );

    const amazon = extractMetadata(html, 'https://www.amazon.co.uk/dp/1');
    assert.equal(amazon.title, 'Product');
    assert.equal(amazon.publisher, 'Amazon');
    assert.equal(amazon.image, 'https://www.amazon.co.uk/l.jpg');

    const other = extractMetadata(html, 'https://www.rangemedia.co/dp/1');
    assert.equal(other.title, 'Amazon.com');
    assert.equal(other.publisher, 'Site');
  });
});

describe('isAmazonUrl', function () {
  it('matches on the registrable domain', function () {
    assert.equal(isAmazonUrl('https://www.amazon.com/dp/1'), true);
    assert.equal(isAmazonUrl('https://amzn.to/abc'), true);
    assert.equal(isAmazonUrl('https://a.co/d/abc'), true);
    assert.equal(isAmazonUrl('https://www.rangemedia.co/x'), false);
    assert.equal(isAmazonUrl('https://amazon.evil.com/x'), false);
    assert.equal(isAmazonUrl('https://amazon.com.evil.org/x'), false);
  });
});

describe('pickIcon', function () {
  const { icons } = extractMetadata(
    page(`
      <link rel="apple-touch-icon" sizes="180x180" href="/apple.png">
      <link rel="mask-icon" href="/mask.svg">
      <link rel="icon" sizes="16x16" href="/favicon-16.png">
      <link rel="icon" sizes="32x32" href="/favicon-32.png">
    `),
    'https://example.com',
  );

  it('picks the biggest standard favicon for bookmarks', function () {
    assert.equal(pickIcon(icons, 'bookmark'), 'https://example.com/favicon-32.png');
  });

  it('picks the apple-touch-icon for mentions', function () {
    assert.equal(pickIcon(icons, 'mention'), 'https://example.com/apple.png');
  });

  it('returns nothing without icons', function () {
    assert.equal(pickIcon([], 'bookmark'), undefined);
  });
});

describe('getFaviconProbeUrls', function () {
  it('probes the origin and then the registrable domain', function () {
    assert.deepEqual(
      getFaviconProbeUrls('https://blog.example.com/post').map(([url]) => url),
      [
        'https://blog.example.com/favicon.ico',
        'https://blog.example.com/favicon.png',
        'https://example.com/favicon.ico',
        'https://example.com/favicon.png',
      ],
    );
  });

  it('only probes the origin for apex domains and IPs', function () {
    assert.deepEqual(
      getFaviconProbeUrls('http://127.0.0.1:2368/post').map(([url]) => url),
      ['http://127.0.0.1:2368/favicon.ico', 'http://127.0.0.1:2368/favicon.png'],
    );
    assert.equal(getFaviconProbeUrls('https://example.com/').length, 2);
  });
});
