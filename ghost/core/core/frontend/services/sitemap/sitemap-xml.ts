import path from 'node:path';
import urlUtils from '../../../shared/url-utils';

// Ghost renders exactly two sitemap documents, both with a shape the
// sitemaps.org schema fixes: a <urlset> per resource type, and the
// <sitemapindex> that lists them. They are emitted here directly rather than
// through a generic xml library — for a shape this fixed a library spends
// several times as long walking an object tree as writing the tags costs, and
// keeping both documents in one module keeps escaping in one auditable place.

const URLSET_OPEN =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
  ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
const URLSET_CLOSE = '</urlset>';

const SITEMAPINDEX_OPEN = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const SITEMAPINDEX_CLOSE = '</sitemapindex>';

// The characters the xml package escaped in text content, kept character for
// character so the rendered sitemaps do not change.
const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * An entry of a sitemap document: an absolute url, and the epoch milliseconds
 * behind its <lastmod>.
 */
export interface SiteMapEntry {
  loc: string;
  ts: number;
}

/**
 * A <urlset> entry, which may also carry an image.
 */
export interface SiteMapUrlEntry extends SiteMapEntry {
  imageLoc?: string | null;
}

export function escapeXml(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => XML_ESCAPES[char]);
}

export function getDeclarations(): string {
  const baseUrl = urlUtils.urlFor('sitemap_xsl', true).replace(/^(http:|https:)/, '');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<?xml-stylesheet type="text/xsl" href="' +
    baseUrl +
    '"?>'
  );
}

/**
 * The <urlset> document for one page of one resource type.
 *
 * @param entries in the order they should appear
 */
export function renderUrlSet(entries: readonly SiteMapUrlEntry[]): string {
  // Joined rather than concatenated: join returns a flat string, where
  // repeated concatenation leaves a rope whose fragments are held for as long
  // as the cached sitemap is.
  const parts = [getDeclarations(), URLSET_OPEN];

  for (const entry of entries) {
    parts.push(
      '<url><loc>',
      escapeXml(entry.loc),
      '</loc><lastmod>',
      new Date(entry.ts).toISOString(),
      '</lastmod>',
    );

    if (entry.imageLoc) {
      parts.push(
        '<image:image><image:loc>',
        escapeXml(entry.imageLoc),
        '</image:loc><image:caption>',
        escapeXml(path.basename(entry.imageLoc)),
        '</image:caption></image:image>',
      );
    }

    parts.push('</url>');
  }

  parts.push(URLSET_CLOSE);

  return parts.join('');
}

/**
 * The <sitemapindex> document listing every page of every resource type.
 */
export function renderSiteMapIndex(entries: readonly SiteMapEntry[]): string {
  const parts = [getDeclarations(), SITEMAPINDEX_OPEN];

  for (const entry of entries) {
    parts.push(
      '<sitemap><loc>',
      escapeXml(entry.loc),
      '</loc><lastmod>',
      new Date(entry.ts).toISOString(),
      '</lastmod></sitemap>',
    );
  }

  parts.push(SITEMAPINDEX_CLOSE);

  return parts.join('');
}
