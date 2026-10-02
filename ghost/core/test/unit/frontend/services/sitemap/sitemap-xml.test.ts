import assert from 'node:assert/strict';
import {
  escapeXml,
  renderSiteMapIndex,
  renderUrlSet,
} from '../../../../../core/frontend/services/sitemap/sitemap-xml';

describe('sitemap xml', function () {
  const TS = Date.UTC(2024, 0, 1);

  describe('fn: escapeXml', function () {
    it('escapes the five xml entities and nothing else', function () {
      assert.equal(escapeXml(`&"'<>`), '&amp;&quot;&apos;&lt;&gt;');
      assert.equal(escapeXml('plain/path-ü'), 'plain/path-ü');
    });
  });

  describe('fn: renderUrlSet', function () {
    it('renders loc and lastmod for each entry, in the order given', function () {
      const xml = renderUrlSet([
        { loc: 'https://blog.com/second/', ts: TS },
        { loc: 'https://blog.com/first/', ts: TS + 1000 },
      ]);

      assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
      assert(xml.indexOf('/second/') < xml.indexOf('/first/'), 'entries render in the given order');
      assert.match(xml, /<lastmod>2024-01-01T00:00:00\.000Z<\/lastmod>/);
      assert(xml.endsWith('</urlset>'));
    });

    it('adds an image:image element, captioned with the file name', function () {
      const xml = renderUrlSet([
        { loc: 'https://blog.com/a/', ts: TS, imageLoc: 'https://blog.com/content/images/x.jpg' },
      ]);

      assert.match(
        xml,
        /<image:image><image:loc>https:\/\/blog\.com\/content\/images\/x\.jpg<\/image:loc><image:caption>x\.jpg<\/image:caption><\/image:image>/,
      );
    });

    it('omits the image element when there is no image', function () {
      const xml = renderUrlSet([{ loc: 'https://blog.com/a/', ts: TS, imageLoc: null }]);

      assert.doesNotMatch(xml, /image:image/);
    });

    it('escapes urls and captions', function () {
      const xml = renderUrlSet([
        { loc: 'https://blog.com/a&b/', ts: TS, imageLoc: 'https://blog.com/me & you.jpg' },
      ]);

      assert.match(xml, /<loc>https:\/\/blog\.com\/a&amp;b\/<\/loc>/);
      assert.match(xml, /<image:caption>me &amp; you\.jpg<\/image:caption>/);
      // No raw ampersand may survive anywhere in the document
      assert.doesNotMatch(xml, /&(?!amp;|quot;|apos;|lt;|gt;)/);
    });

    it('renders an empty but well-formed urlset for no entries', function () {
      // Suppressing empty sitemaps is the generator's job, not this module's.
      const xml = renderUrlSet([]);

      assert.match(xml, /<urlset [^>]+><\/urlset>$/);
    });
  });

  describe('fn: renderSiteMapIndex', function () {
    it('renders a sitemap element per entry', function () {
      const xml = renderSiteMapIndex([
        { loc: 'https://blog.com/sitemap-posts.xml', ts: TS },
        { loc: 'https://blog.com/sitemap-posts-2.xml', ts: TS },
      ]);

      assert.match(
        xml,
        /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,
      );
      assert.equal(xml.match(/<sitemap>/g)?.length, 2);
      assert.match(
        xml,
        /<sitemap><loc>https:\/\/blog\.com\/sitemap-posts\.xml<\/loc><lastmod>2024-01-01T00:00:00\.000Z<\/lastmod><\/sitemap>/,
      );
      assert(xml.endsWith('</sitemapindex>'));
    });

    it('renders an empty but well-formed index for no entries', function () {
      const xml = renderSiteMapIndex([]);

      assert.match(xml, /<sitemapindex [^>]+><\/sitemapindex>$/);
    });
  });
});
