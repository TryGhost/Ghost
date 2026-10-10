/**
 * The extraction rules in this module are adapted from [metascraper][0].
 * Its license is copied below.
 *
 * [0]: https://github.com/microlinkhq/metascraper
 *
 * The MIT License (MIT)
 *
 * Copyright © 2019 Microlink <hello@microlink.io> (microlink.io)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { load, type CheerioAPI } from 'cheerio/slim';
import { parseDate } from 'chrono-node';
import { decodeHTML } from 'entities';
import { jsonrepair } from 'jsonrepair';
import { getDomain } from 'tldts';

/**
 * Bookmark metadata extraction from a page's HTML.
 *
 * Rules and their order follow what metascraper's url/title/description/
 * author/publisher/image/logo/logo-favicon/amazon plugins did, so bookmark
 * cards keep picking the same values without its dependency tree. Nothing
 * here touches the network; favicon probing stays in the oembed service so
 * it goes through externalRequest.
 */

export interface IconSize {
  width: number;
  height: number;
  square: boolean;
  priority: number;
}

export interface IconCandidate {
  url: string;
  rel?: string;
  href?: string;
  sizes?: string;
  size: IconSize;
}

export interface PageMetadata {
  url: string | null;
  title: string | null;
  description: string | null;
  author: string | null;
  publisher: string | null;
  image: string | null;
  /** icons declared in the page's markup, resolved to absolute URLs */
  icons: IconCandidate[];
  /** a logo declared in the page's markup, used when no favicon is found */
  logo: string | null;
}

type Value = string | null | undefined | false;
type Selection = ReturnType<CheerioAPI>;
type Rule = () => Value;

const AUTHOR_MAX_LENGTH = 128;
const REGEX_BY = /^[\s\n]*by[\s\n]+|@[\s\n]*/i;
const REGEX_LOCATION = /^[A-Z\s]+\s+[-—–]\s+/;
const REGEX_STRICT_AUTHOR = /^\S+\s+\S+/;
const REGEX_TITLE_PUBLISHER = /^.*?[-|]\s+(.*)$/;
const REGEX_LOOKS_LIKE_URL = /^(?:[a-z][a-z\d+.-]*:)?\/\/\S+$|^[^\s/]+\.[a-z]{2,}(?:\/\S*)?$/i;
const REGEX_SIZE = /(\d+)\s*[x×]\s*(\d+)/i;
const REGEX_MEDIA_EXTENSION =
  /\.(?:mp4|m4v|mov|webm|mkv|avi|wmv|flv|ogv|mpe?g|3gp|mp3|m4a|wav|ogg|oga|flac|aac|opus|wma|mpga)$/i;

// Favicon locations to probe when the page declares no usable icon, along
// with the content types each must be served as
export const FAVICON_PROBES: ReadonlyArray<[string, string[]]> = [
  ['ico', ['image/vnd.microsoft.icon', 'image/x-icon']],
  ['png', ['image/png']],
];

const first = (rules: Rule[]): string | null => {
  for (const rule of rules) {
    const value = rule();
    if (value) {
      return value;
    }
  }
  return null;
};

const condense = (value: string) => value.replace(/\s+/g, ' ').trim();

const toText = (value: unknown) => (typeof value === 'string' ? condense(value) : undefined);

const toTitle = toText;

const toPublisher = toText;

const toDescription = (value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }
  return condense(value.replace(REGEX_LOCATION, '')).replace(/\s?\.\.\.?$/, '…');
};

const toAuthor = (value: unknown) => {
  if (typeof value !== 'string' || !value || value.length > AUTHOR_MAX_LENGTH) {
    return;
  }
  if (REGEX_LOOKS_LIKE_URL.test(value.trim())) {
    return;
  }
  return condense(value.replace(REGEX_BY, ''));
};

/**
 * Resolves a URL from the page against the page's own URL, allowing only
 * http(s) since the result is fetched or rendered as a link
 */
const toUrl = (value: unknown, baseUrl: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    return;
  }
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_\w+/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.href;
  } catch {
    // not a URL
  }
};

const toImage = (value: unknown, baseUrl: string) => {
  const url = toUrl(value, baseUrl);
  if (url && !REGEX_MEDIA_EXTENSION.test(new URL(url).pathname)) {
    return url;
  }
};

// Byline containers can hold relative timestamps as well as calendar dates.
const isLikelyDate = (value: string) =>
  !Number.isNaN(Date.parse(value)) || parseDate(value) !== null;

export const isAmazonUrl = (url: string) => {
  const domain = getDomain(url);
  if (!domain) {
    return false;
  }
  if (domain === 'a.co') {
    return true;
  }
  return /^(?:amazon|amzn)\./.test(domain);
};

type JsonLdItem = Record<string, unknown>;

const parseJsonLd = ($: CheerioAPI): JsonLdItem[] => {
  return $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((el) => {
      const source = $(el).text();
      let json;
      try {
        json = JSON.parse(source);
      } catch {
        // Preserve metascraper's tolerance for comments, trailing commas and
        // other repairable mistakes in a page's structured metadata.
        try {
          json = JSON.parse(jsonrepair(source));
        } catch {
          return [];
        }
      }
      if (!json || typeof json !== 'object') {
        return [];
      }
      const { '@graph': graph, ...props } = json;
      if (Array.isArray(graph)) {
        return graph.map((item) => ({ ...props, ...item }));
      }
      return Array.isArray(json) ? json : [graph ? props : json];
    })
    .filter((item) => item && typeof item === 'object');
};

const getPath = (data: unknown, props: string[]): unknown => {
  let value = data;
  for (const prop of props) {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[prop];
  }
  return value;
};

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
};

/**
 * Collects primitive values at a schema.org path, traversing arrays and
 * resolving objects to their `name`. `exact` only follows the given path;
 * otherwise nested objects are searched for it too.
 */
const searchSchema = (data: unknown, props: string[], exact: boolean): unknown[] => {
  if (data === null || data === undefined) {
    return [];
  }
  if (typeof data !== 'object') {
    return props.length === 0 ? [data] : [];
  }
  if (Array.isArray(data)) {
    if (
      props.length === 0 &&
      data.every((item) => typeof item === 'string' || typeof item === 'number')
    ) {
      return data.map(String);
    }
    return data.flatMap((item) => searchSchema(item, props, exact));
  }

  const record = data as Record<string, unknown>;
  const [prop, ...rest] = props;
  if (!prop) {
    return typeof record.name === 'string' ? [record.name] : [];
  }
  if (Object.hasOwn(record, prop)) {
    const result = searchSchema(record[prop], rest, exact);
    if (result.length > 0) {
      return result;
    }
  }
  if (exact) {
    return [];
  }
  return Object.keys(record)
    .filter((key) => !key.startsWith('@'))
    .flatMap((key) => searchSchema(record[key], props, false));
};

const createJsonLd = ($: CheerioAPI) => {
  let items: JsonLdItem[] | undefined;

  return (path: string): unknown => {
    items ??= parseJsonLd($);
    const props = path.split('.');
    let fallback: unknown;

    for (const item of items) {
      const value = getPath(item, props);
      if (!isEmptyValue(value)) {
        return typeof value === 'string' ? decodeHTML(value) : value;
      }
      if (value !== null && value !== undefined) {
        continue;
      }
      if (fallback !== undefined) {
        continue;
      }
      const exactResults = searchSchema(item, props, true);
      if (exactResults.length > 0) {
        fallback = exactResults.length > 1 ? exactResults.join(' and ') : exactResults[0];
      } else {
        fallback = searchSchema(item, props, false)[0];
      }
    }

    return typeof fallback === 'string' ? decodeHTML(fallback) : fallback;
  };
};

const getIconSize = (url: string, sizes: string | undefined): IconSize => {
  const match = REGEX_SIZE.exec(sizes ?? '') ?? REGEX_SIZE.exec(url);
  const width = match ? Number(match[1]) : 0;
  const height = match ? Number(match[2]) : 0;

  // prefer formats that tend to be larger and better looking
  let weight = 1;
  if (url.includes('apple') || url.includes('android') || url.endsWith('png')) {
    weight = 5;
  } else if (url.endsWith('jpg') || url.endsWith('jpeg')) {
    weight = 4;
  } else if (url.endsWith('svg')) {
    weight = 3;
  } else if (url.endsWith('ico')) {
    weight = 2;
  }

  return { width, height, square: width === height, priority: weight * (width || 1) };
};

const getIcons = ($: CheerioAPI, pageUrl: string): IconCandidate[] => {
  const candidates = [
    ...$('link[rel*="icon" i]')
      .toArray()
      .map((el) => ({ attribs: $(el).attr() ?? {}, href: $(el).attr('href') })),
    // Windows tile images; other msapplication-* tags hold colors and config
    ...$('meta[name*="msapplication-" i]')
      .toArray()
      .filter((el) => /tileimage|logo$/i.test($(el).attr('name') ?? ''))
      .map((el) => ({ attribs: $(el).attr() ?? {}, href: $(el).attr('content') })),
  ];

  return candidates.flatMap(({ attribs, href }) => {
    if (!href || href === pageUrl || href.startsWith('#')) {
      return [];
    }
    const url = toImage(href, pageUrl);
    if (!url) {
      return [];
    }
    return [{ ...attribs, url, size: getIconSize(url, attribs.sizes) }];
  });
};

const pickBiggest = (icons: IconCandidate[]) => {
  const sorted = [...icons].sort((a, b) => b.size.priority - a.size.priority);
  return (sorted.find((icon) => icon.size.square) ?? sorted[0])?.url;
};

/**
 * Picks the icon to show for a page from the icons declared in its markup.
 *
 * Bookmark cards (including the oembed fallback, which resolves to a
 * bookmark) render the icon inline in the post body, where the site's
 * standard (often transparent) favicon matches surrounding chrome better
 * than an Apple Touch icon's solid-background square. The Recommendations
 * Avatar (type='mention') instead scales the icon up into a larger tile,
 * where Apple Touch is the better fit.
 */
export const pickIcon = (icons: IconCandidate[], type: string): string | undefined => {
  const appleTouchIcon = icons.find(
    (icon) => icon.rel?.includes('apple') && icon.sizes && icon.size.width >= 180,
  );

  if (type === 'bookmark') {
    // link[rel*="icon"] also matches apple-touch-icon, mask-icon (Safari
    // pinned-tab silhouette), and fluid-icon (Fluid SSB) — none of those are
    // the site's standard brand favicon
    const standardIcons = icons.filter(
      (icon) => !/apple|mask-icon|fluid-icon/.test(icon.rel ?? ''),
    );
    const svgIcon = standardIcons.find((icon) => icon.href?.endsWith('svg'));
    return svgIcon?.url || pickBiggest(standardIcons) || appleTouchIcon?.url;
  }

  const svgIcon = icons.find((icon) => icon.href?.endsWith('svg'));
  return appleTouchIcon?.url || svgIcon?.url || pickBiggest(icons);
};

/**
 * Favicon URLs to probe, in order, when the page declares no usable icon:
 * the page's origin, then its registrable domain (e.g. blog.example.com
 * falls back to example.com).
 */
export const getFaviconProbeUrls = (pageUrl: string): Array<[string, string[]]> => {
  const url = new URL(pageUrl);
  const origins = [url.origin];

  const domain = getDomain(pageUrl);
  if (domain && domain !== url.hostname) {
    const root = new URL(url.origin);
    root.hostname = domain;
    origins.push(root.origin);
  }

  return origins.flatMap((origin) =>
    FAVICON_PROBES.map(([ext, contentTypes]): [string, string[]] => [
      `${origin}/favicon.${ext}`,
      contentTypes,
    ]),
  );
};

export const extractMetadata = (html: string, pageUrl: string): PageMetadata => {
  const $ = load(html, { baseURI: pageUrl });
  // cheerio/slim parses <noscript> contents as markup, where browsers (and
  // cheerio's parse5 build) see text, so tracking pixels in there would be
  // picked up as images
  $('noscript').remove();
  const jsonld = createJsonLd($);
  const isAmazon = isAmazonUrl(pageUrl);

  const attr = (selector: string, name = 'content') => $(selector).attr(name);

  // first matching element whose (mapped) text is non-empty
  const text = (
    selector: string,
    fn: (el: Selection) => Value = (el) => condense(el.text()),
  ): Value => {
    for (const el of $(selector).toArray()) {
      const value = fn($(el));
      if (value) {
        return value;
      }
    }
  };

  const strict = (value: Value) => (value && REGEX_STRICT_AUTHOR.test(value) ? value : undefined);

  // a JSON-LD logo only counts when it's square
  const jsonLdLogo = (path: string) => {
    const logo = jsonld(path) as { width?: unknown; height?: unknown; url?: unknown } | undefined;
    if (logo && typeof logo === 'object' && logo.width && logo.width === logo.height) {
      return toImage(logo.url, pageUrl);
    }
  };

  const amazon = <T>(rules: T[]): T[] => (isAmazon ? rules : []);

  return {
    url: first([
      () => toUrl(attr('meta[property="og:url"]'), pageUrl),
      () => toUrl(attr('meta[name="twitter:url"]'), pageUrl),
      () => toUrl(attr('meta[property="twitter:url"]'), pageUrl),
      () => toUrl(attr('link[rel="canonical"]', 'href'), pageUrl),
      () => toUrl(attr('link[rel="alternate"][hreflang="x-default"]', 'href'), pageUrl),
      () => toUrl(pageUrl, pageUrl),
    ]),

    title: first([
      ...amazon([
        () => text('#productTitle'),
        () => text('#btAsinTitle'),
        () => text('h1.a-size-large'),
        () => text('#item_name'),
      ]),
      () => toTitle(attr('meta[property="og:title"]')),
      () => toTitle(attr('meta[name="twitter:title"]')),
      () => toTitle(attr('meta[property="twitter:title"]')),
      () => text('title'),
      () => toTitle(jsonld('headline')),
      () => text('.post-title'),
      () => text('.entry-title'),
      () => text('h1[class*="title" i] a'),
      () => text('h1[class*="title" i]'),
    ]),

    description: first([
      () => toDescription(attr('meta[property="og:description"]')),
      () => toDescription(attr('meta[name="twitter:description"]')),
      () => toDescription(attr('meta[property="twitter:description"]')),
      () => toDescription(attr('meta[name="description"]')),
      () => toDescription(attr('meta[itemprop="description"]')),
      () => toDescription(jsonld('articleBody')),
      () => toDescription(jsonld('description')),
    ]),

    author: first([
      ...amazon([
        () => toAuthor(text('.contributorNameID')),
        () => toAuthor(text('#bylineInfo')),
        () => toAuthor(text('#brand')),
      ]),
      () => toAuthor(jsonld('author.name')),
      () => toAuthor(jsonld('brand.name')),
      () => toAuthor(attr('meta[name="author"]')),
      () => toAuthor(attr('meta[property="article:author"]')),
      () => toAuthor(text('[itemprop*="author" i] [itemprop="name"]')),
      () => toAuthor(text('[itemprop*="author" i]')),
      () => toAuthor(text('[rel="author"]')),
      () => strict(toAuthor(text('a[class*="author" i]'))),
      () => strict(toAuthor(text('[class*="author" i] a'))),
      () => strict(toAuthor(text('a[href*="/author/" i]'))),
      () => toAuthor(text('a[class*="screenname" i]')),
      () => strict(toAuthor(text('[class*="author" i]'))),
      () =>
        strict(
          toAuthor(
            text('[class*="byline" i]', (el) => {
              const value = condense(el.text());
              return !isLikelyDate(value) && value;
            }),
          ),
        ),
    ]),

    publisher: isAmazon
      ? 'Amazon'
      : first([
          () => toPublisher(jsonld('publisher.name')),
          () => toPublisher(attr('meta[property="og:site_name"]')),
          () => toPublisher(attr('meta[name*="application-name" i]')),
          () => toPublisher(attr('meta[name*="app-title" i]')),
          () => toPublisher(attr('meta[property*="app_name" i]')),
          () => toPublisher(attr('meta[name="publisher" i]')),
          () => toPublisher(attr('meta[name="twitter:app:name:iphone"]')),
          () => toPublisher(attr('meta[property="twitter:app:name:iphone"]')),
          () => toPublisher(attr('meta[name="twitter:app:name:ipad"]')),
          () => toPublisher(attr('meta[property="twitter:app:name:ipad"]')),
          () => toPublisher(attr('meta[name="twitter:app:name:googleplay"]')),
          () => toPublisher(attr('meta[property="twitter:app:name:googleplay"]')),
          () => text('#logo'),
          () => text('.logo'),
          () => text('a[class*="brand" i]'),
          () => toPublisher(attr('[class*="logo" i] a img[alt]', 'alt')),
          () => toPublisher(attr('[class*="logo" i] img[alt]', 'alt')),
          () =>
            text('title', (el) => {
              // "Post title - Site name" → "Site name"
              let match = REGEX_TITLE_PUBLISHER.exec(condense(el.text()));
              let result;
              while (match) {
                result = match[1];
                match = REGEX_TITLE_PUBLISHER.exec(result);
              }
              return result;
            }),
        ]),

    image: first([
      ...amazon([
        () => toUrl(attr('.a-dynamic-image', 'data-old-hires'), pageUrl),
        () => toUrl(attr('.a-dynamic-image', 'src'), pageUrl),
      ]),
      () => toImage(attr('meta[property="og:image:secure_url"]'), pageUrl),
      () => toImage(attr('meta[property="og:image:url"]'), pageUrl),
      () => toImage(attr('meta[property="og:image"]'), pageUrl),
      () => toImage(attr('meta[name="twitter:image:src"]'), pageUrl),
      () => toImage(attr('meta[property="twitter:image:src"]'), pageUrl),
      () => toImage(attr('meta[name="twitter:image"]'), pageUrl),
      () => toImage(attr('meta[property="twitter:image"]'), pageUrl),
      () => toImage(attr('meta[itemprop="image"]'), pageUrl),
      () => toImage(jsonld('image.0.url'), pageUrl),
      () => toImage(jsonld('image.url'), pageUrl),
      () => toImage(jsonld('image'), pageUrl),
      () =>
        toImage(
          text('article img[src]', (el) => el.attr('src')),
          pageUrl,
        ),
      () =>
        toImage(
          text('#content img[src]', (el) => el.attr('src')),
          pageUrl,
        ),
      () => toImage(attr('img[alt*="author" i]', 'src'), pageUrl),
      () => toImage(attr('img[src]:not([aria-hidden="true"])', 'src'), pageUrl),
    ]),

    icons: getIcons($, pageUrl),

    logo: first([
      () => toImage(attr('meta[property="og:logo"]'), pageUrl),
      () => toImage(attr('meta[itemprop="logo"]'), pageUrl),
      () => toImage(attr('img[itemprop="logo"]', 'src'), pageUrl),
      () => jsonLdLogo('brand.logo'),
      () => jsonLdLogo('organization.logo'),
      () => jsonLdLogo('place.logo'),
      () => jsonLdLogo('product.logo'),
      () => jsonLdLogo('service.logo'),
      () => jsonLdLogo('publisher.logo'),
      () => jsonLdLogo('logo.url'),
      () => jsonLdLogo('logo'),
    ]),
  };
};
