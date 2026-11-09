import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { BlockList, isIP } from 'node:net';

const MAX_EPISODE_PAGE_BYTES = 1024 * 1024;
const MAX_PODCAST_FEED_BYTES = 5 * 1024 * 1024;

type LookupResult = { address: string; family: number };
type LookupAll = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<LookupResult[]>;
type ResponseBody = ReadableStream<Uint8Array> | AsyncIterable<Uint8Array> | null;
type PageResponse = Pick<Response, 'status' | 'ok' | 'headers' | 'url'> & { body: ResponseBody };
type FetchPage = (url: string, init: RequestInit) => Promise<PageResponse>;

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

export type ResolvedEpisode = {
  submittedUrl: string;
  canonicalUrl: string;
  title: string;
  showName: string;
  description: string;
  artworkUrl: string;
  audioUrl: string;
  duration: string;
};

function publicHttpsUrl(value: string, base?: string): string {
  const url = new URL(value, base);
  const hostname = url.hostname.toLowerCase();
  const address =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  if (
    url.protocol !== 'https:' ||
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    (isIP(address) !== 0 && !isPublicIpAddress(address))
  ) {
    throw new Error('Podcast episode URLs must use public HTTPS addresses');
  }
  return url.toString();
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return !blockedAddresses.check(address, 'ipv4');
  }
  if (family !== 6) {
    return false;
  }
  try {
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(normalized);
    if (mapped) {
      const high = Number.parseInt(mapped[1], 16);
      const low = Number.parseInt(mapped[2], 16);
      return isPublicIpAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
  } catch {
    return false;
  }
  return !blockedAddresses.check(address, 'ipv6');
}

async function resolvePublicAddresses(
  hostname: string,
  lookupAll: LookupAll,
): Promise<LookupResult[]> {
  const address =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  const directFamily = isIP(address);
  const results =
    directFamily === 0
      ? await lookupAll(hostname, { all: true, verbatim: true })
      : [{ address, family: directFamily }];
  if (results.length === 0 || results.some((result) => !isPublicIpAddress(result.address))) {
    throw new Error('Podcast episode URL must resolve to the public network');
  }
  return results;
}

export async function resolvePublicAddress(
  hostname: string,
  lookupAll: LookupAll = dnsLookup as LookupAll,
  family = 0,
): Promise<LookupResult> {
  const results = await resolvePublicAddresses(hostname, lookupAll);
  const selected = family === 0 ? results[0] : results.find((result) => result.family === family);
  if (!selected) {
    throw new Error(`No public IPv${family} address is available`);
  }
  return selected;
}

export function createPublicLookup(
  lookupAll: LookupAll = dnsLookup as LookupAll,
): NonNullable<RequestOptions['lookup']> {
  type LookupOptions = { all?: boolean; family?: number };
  type LookupCallback = (
    error: Error | null,
    address?: string | LookupResult[],
    family?: number,
  ) => void;
  return ((hostname: string, rawOptions: LookupOptions | number, callback: LookupCallback) => {
    const options = typeof rawOptions === 'number' ? { family: rawOptions } : rawOptions;
    resolvePublicAddresses(hostname, lookupAll).then(
      (results) => {
        const candidates = options.family
          ? results.filter((result) => result.family === options.family)
          : results;
        if (candidates.length === 0) {
          callback(new Error(`No public IPv${options.family} address is available`));
        } else if (options.all) {
          callback(null, candidates);
        } else {
          callback(null, candidates[0].address, candidates[0].family);
        }
      },
      (error) => callback(error instanceof Error ? error : new Error('DNS lookup failed')),
    );
  }) as NonNullable<RequestOptions['lookup']>;
}

function headersFromIncoming(headers: import('node:http').IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => result.append(name, entry));
    } else if (value !== undefined) {
      result.set(name, value);
    }
  }
  return result;
}

function fetchPublicPage(value: string, init: RequestInit): Promise<PageResponse> {
  const url = new URL(publicHttpsUrl(value));
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        headers: init.headers as import('node:http').OutgoingHttpHeaders,
        lookup: createPublicLookup(),
        method: init.method,
        signal: init.signal ?? undefined,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        resolve({
          status,
          ok: status >= 200 && status < 300,
          headers: headersFromIncoming(response.headers),
          url: url.toString(),
          body: response,
        });
      },
    );
    request.once('error', reject);
    request.end();
  });
}

async function cancelBody(body: ResponseBody): Promise<void> {
  if (!body) {
    return;
  }
  if (body instanceof ReadableStream) {
    await body.cancel();
    return;
  }
  const destroyable = body as AsyncIterable<Uint8Array> & { destroy?: () => void };
  destroyable.destroy?.();
}

async function readBoundedText(
  body: ResponseBody,
  maxBytes: number,
  label: string,
): Promise<string> {
  if (!body) {
    return '';
  }
  const decoder = new TextDecoder();
  let streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let bytes = 0;
  let text = '';
  const append = (chunk: Uint8Array) => {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) {
      throw new Error(`${label} is too large`);
    }
    text += decoder.decode(chunk, { stream: true });
  };

  try {
    if (body instanceof ReadableStream) {
      streamReader = body.getReader();
      while (true) {
        const { done, value } = await streamReader.read();
        if (done) {
          break;
        }
        append(value);
      }
    } else {
      for await (const chunk of body) {
        append(chunk);
      }
    }
    return text + decoder.decode();
  } catch (error) {
    if (streamReader) {
      await streamReader.cancel().catch(() => undefined);
    } else {
      await cancelBody(body);
    }
    throw error;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([\da-f]+);/gi, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim();
}

function attributeValue(tag: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    'i',
  ).exec(tag);
  return decodeHtml(match?.[1] || match?.[2] || match?.[3] || '');
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forward = new RegExp(
    `<meta[^>]+(?:property|name)=(["'])${escaped}\\1[^>]+content=(["'])(.*?)\\2[^>]*>`,
    'i',
  );
  const reverse = new RegExp(
    `<meta[^>]+content=(["'])(.*?)\\1[^>]+(?:property|name)=(["'])${escaped}\\3[^>]*>`,
    'i',
  );
  return decodeHtml(forward.exec(html)?.[3] || reverse.exec(html)?.[2] || '');
}

function linkHref(html: string, relation: string): string {
  const escaped = relation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forward = new RegExp(
    `<link[^>]+rel=(["'])${escaped}\\1[^>]+href=(["'])(.*?)\\2[^>]*>`,
    'i',
  );
  const reverse = new RegExp(
    `<link[^>]+href=(["'])(.*?)\\1[^>]+rel=(["'])${escaped}\\3[^>]*>`,
    'i',
  );
  return decodeHtml(forward.exec(html)?.[3] || reverse.exec(html)?.[2] || '');
}

function feedHref(html: string): string {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const relations = attributeValue(tag, 'rel').toLowerCase().split(/\s+/);
    const type = attributeValue(tag, 'type').toLowerCase();
    if (
      relations.includes('alternate') &&
      ['application/rss+xml', 'application/atom+xml', 'application/xml', 'text/xml'].includes(type)
    ) {
      return attributeValue(tag, 'href');
    }
  }
  return '';
}

function optionalHttpsUrl(value: string, base: string): string {
  if (!value) {
    return '';
  }
  try {
    return publicHttpsUrl(value, base);
  } catch {
    return '';
  }
}

function formatDuration(value: string): string {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? `${Math.round(seconds / 60)} min` : value;
}

function elementContent(markup: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`, 'i').exec(
    markup,
  );
  return match?.[1]?.trim() || '';
}

function textContent(markup: string, name: string): string {
  const content = elementContent(markup, name).replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
  return decodeHtml(content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

function openingTag(markup: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<${escaped}\\b[^>]*>`, 'i').exec(markup)?.[0] || '';
}

function comparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return '';
  }
}

function parseFeedEpisode(
  feed: string,
  feedUrl: string,
  submittedUrl: string,
  matchUrl?: string,
): ResolvedEpisode {
  const firstItemIndex = feed.search(/<item\b/i);
  const channel = firstItemIndex === -1 ? feed : feed.slice(0, firstItemIndex);
  const showName = textContent(channel, 'title');
  const channelImage =
    attributeValue(openingTag(channel, 'itunes:image'), 'href') ||
    textContent(elementContent(channel, 'image'), 'url');
  const items = Array.from(
    feed.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi),
    (match) => match[1],
  );
  const expectedUrl = comparableUrl(matchUrl || '');
  const item = items.find((candidate) => {
    const enclosure = openingTag(candidate, 'enclosure');
    const audioUrl = attributeValue(enclosure, 'url');
    const type = attributeValue(enclosure, 'type');
    if (!audioUrl || (type && !type.toLowerCase().startsWith('audio/'))) {
      return false;
    }
    if (!expectedUrl) {
      return true;
    }
    return [textContent(candidate, 'link'), textContent(candidate, 'guid')].some(
      (value) => comparableUrl(value) === expectedUrl,
    );
  });
  if (!item) {
    throw new Error(
      matchUrl
        ? 'The podcast feed does not contain this episode'
        : 'The podcast feed does not contain an audio episode',
    );
  }

  const enclosure = openingTag(item, 'enclosure');
  const audioUrl = optionalHttpsUrl(attributeValue(enclosure, 'url'), feedUrl);
  const title = textContent(item, 'title');
  if (!title || !audioUrl) {
    throw new Error('The podcast feed does not expose episode metadata');
  }

  const itemUrl =
    optionalHttpsUrl(textContent(item, 'link'), feedUrl) ||
    optionalHttpsUrl(textContent(item, 'guid'), feedUrl);
  return {
    submittedUrl,
    canonicalUrl: itemUrl || matchUrl || feedUrl,
    title,
    showName,
    description: textContent(item, 'description'),
    artworkUrl: optionalHttpsUrl(
      attributeValue(openingTag(item, 'itunes:image'), 'href') || channelImage,
      feedUrl,
    ),
    audioUrl,
    duration: formatDuration(textContent(item, 'itunes:duration')),
  };
}

function isFeedResponse(url: string, contentType: string): boolean {
  return (
    /(?:application|text)\/(?:rss\+xml|atom\+xml|xml)/i.test(contentType) ||
    /(?:\.rss|\.xml)(?:$|[?#])/i.test(url) ||
    /\/feed(?:\/|$|[?#])/i.test(url)
  );
}

async function loadDocument(value: string, fetchPage: FetchPage, expectedFeed = false) {
  let currentUrl = value;
  let response: PageResponse | undefined;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    response = await fetchPage(currentUrl, {
      headers: {
        accept: expectedFeed
          ? 'application/rss+xml,application/xml,text/xml'
          : 'text/html,application/xhtml+xml,application/rss+xml,application/xml,text/xml',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status < 300 || response.status >= 400) {
      break;
    }
    const location = response.headers.get('location');
    if (!location || redirects === 5) {
      await cancelBody(response.body);
      throw new Error(
        `${expectedFeed ? 'Podcast feed' : 'Episode page'} redirected too many times`,
      );
    }
    await cancelBody(response.body);
    currentUrl = publicHttpsUrl(location, currentUrl);
  }
  const label = expectedFeed ? 'Podcast feed' : 'Episode page';
  if (!response) {
    throw new Error(`${label} could not be loaded`);
  }
  if (!response.ok) {
    await cancelBody(response.body);
    throw new Error(`${label} returned ${response.status}`);
  }

  const finalUrl = response.url ? publicHttpsUrl(response.url) : currentUrl;
  const isFeed =
    expectedFeed || isFeedResponse(finalUrl, response.headers.get('content-type') || '');
  const maxBytes = isFeed ? MAX_PODCAST_FEED_BYTES : MAX_EPISODE_PAGE_BYTES;
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    await cancelBody(response.body);
    throw new Error(`${isFeed ? 'Podcast feed' : 'Episode page'} is too large`);
  }
  return {
    finalUrl,
    isFeed,
    text: await readBoundedText(response.body, maxBytes, isFeed ? 'Podcast feed' : 'Episode page'),
  };
}

export async function resolveEpisode(
  submittedValue: string,
  fetchPage: FetchPage = fetchPublicPage,
): Promise<ResolvedEpisode> {
  const submittedUrl = publicHttpsUrl(submittedValue);
  const document = await loadDocument(submittedUrl, fetchPage);
  if (document.isFeed) {
    return parseFeedEpisode(document.text, document.finalUrl, submittedUrl);
  }

  const html = document.text;
  const finalUrl = document.finalUrl;
  const title = metaContent(html, 'og:title') || metaContent(html, 'twitter:title');
  const audioUrl = optionalHttpsUrl(
    metaContent(html, 'og:audio') || metaContent(html, 'twitter:player:stream'),
    finalUrl,
  );
  if (title && audioUrl) {
    return {
      submittedUrl,
      canonicalUrl: optionalHttpsUrl(linkHref(html, 'canonical'), finalUrl) || finalUrl,
      title,
      showName: metaContent(html, 'og:site_name'),
      description: metaContent(html, 'og:description') || metaContent(html, 'description'),
      artworkUrl: optionalHttpsUrl(
        metaContent(html, 'og:image') || metaContent(html, 'twitter:image'),
        finalUrl,
      ),
      audioUrl,
      duration: formatDuration(metaContent(html, 'music:duration')),
    };
  }

  const discoveredFeedUrl = optionalHttpsUrl(feedHref(html), finalUrl);
  if (!discoveredFeedUrl) {
    throw new Error('The page does not expose podcast episode metadata or an RSS feed');
  }
  const canonicalUrl = optionalHttpsUrl(linkHref(html, 'canonical'), finalUrl) || finalUrl;
  const feed = await loadDocument(discoveredFeedUrl, fetchPage, true);
  return parseFeedEpisode(feed.text, feed.finalUrl, submittedUrl, canonicalUrl);
}
