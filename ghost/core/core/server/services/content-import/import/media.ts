import type { PostData } from './post-data';
import type { ExternalMediaImporter, ExternalMediaImportResult } from '../../media-inliner/types';

const cheerio = require('cheerio');

export interface MediaFailure {
  sourceUrl: string;
  reason: string;
}

export class MediaInliningFailure extends Error {
  readonly failures: MediaFailure[];

  constructor(failures: MediaFailure[]) {
    const noun = failures.length === 1 ? 'file' : 'files';
    super(`Could not import ${failures.length} media ${noun}.`);
    this.name = 'MediaInliningFailure';
    this.failures = failures;
  }
}

type JSONRecord = Record<string, unknown>;

const DIRECT_MEDIA_FIELDS: Record<string, string[]> = {
  image: ['src'],
  audio: ['src', 'thumbnailSrc'],
  video: ['src', 'thumbnailSrc', 'customThumbnailSrc'],
  file: ['src'],
  product: ['productImageSrc'],
  header: ['backgroundImageSrc'],
  signup: ['backgroundImageSrc'],
  'call-to-action': ['imageUrl'],
  bookmark: ['metadata.icon', 'metadata.thumbnail'],
  embed: ['metadata.thumbnail_url'],
  'before-after': ['beforeImage.src', 'afterImage.src'],
};

const HTML_MEDIA_FIELDS: Record<string, string[]> = {
  html: ['html'],
  email: ['html'],
  'email-cta': ['html'],
  toggle: ['heading', 'content'],
  image: ['caption'],
  gallery: ['caption'],
  video: ['caption'],
  product: ['productTitle', 'productDescription'],
  header: ['header', 'subheader'],
  bookmark: ['caption'],
  codeblock: ['caption'],
};

const MARKDOWN_MEDIA_FIELDS: Record<string, string[]> = {
  markdown: ['markdown'],
};

function isRecord(value: unknown): value is JSONRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRemoteMediaUrl(value: string): boolean {
  return /^(?:https?:)?\/\//i.test(value.trim());
}

function getPath(record: JSONRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((value, part) => {
    return isRecord(value) ? value[part] : undefined;
  }, record);
}

function setPath(record: JSONRecord, path: string, value: string): void {
  const parts = path.split('.');
  const leaf = parts.pop() as string;
  let target = record;

  for (const part of parts) {
    target = target[part] as JSONRecord;
  }

  target[leaf] = value;
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (match: RegExpMatchArray) => Promise<string>,
): Promise<string> {
  let result = '';
  let lastIndex = 0;

  for (const match of input.matchAll(pattern)) {
    const index = match.index as number;
    result += input.slice(lastIndex, index);
    result += await replacer(match);
    lastIndex = index + match[0].length;
  }

  return result + input.slice(lastIndex);
}

export interface PostMediaInlining {
  inline(data: PostData): Promise<void>;
}

export class PostMediaInliner implements PostMediaInlining {
  private _media: ExternalMediaImporter;
  private _isLocalMediaUrl: (sourceUrl: string) => boolean;
  private _cache = new Map<string, Promise<ExternalMediaImportResult>>();
  private _failures = new Map<string, MediaFailure>();

  constructor({
    media,
    isLocalMediaUrl,
  }: {
    media: ExternalMediaImporter;
    isLocalMediaUrl: (sourceUrl: string) => boolean;
  }) {
    this._media = media;
    this._isLocalMediaUrl = isLocalMediaUrl;
  }

  async inline(data: PostData): Promise<void> {
    this._failures = new Map();

    if (data.feature_image) {
      data.feature_image = await this.inlineUrl(data.feature_image);
    }
    if (data.posts_meta?.og_image) {
      data.posts_meta.og_image = await this.inlineUrl(data.posts_meta.og_image);
    }
    if (data.posts_meta?.twitter_image) {
      data.posts_meta.twitter_image = await this.inlineUrl(data.posts_meta.twitter_image);
    }
    if (data.lexical) {
      data.lexical = await this.inlineLexical(data.lexical);
    }

    if (this._failures.size > 0) {
      throw new MediaInliningFailure([...this._failures.values()]);
    }
  }

  private async inlineUrl(sourceUrl: string): Promise<string> {
    if (!isRemoteMediaUrl(sourceUrl) || this._isLocalMediaUrl(sourceUrl)) {
      return sourceUrl;
    }

    let resultPromise = this._cache.get(sourceUrl);
    if (!resultPromise) {
      resultPromise = this._media.importUrl(sourceUrl);
      this._cache.set(sourceUrl, resultPromise);
    }

    const result = await resultPromise;
    if (result.status === 'failed') {
      this.recordFailure(sourceUrl, result.reason);
      return sourceUrl;
    }

    return result.storedUrl;
  }

  private recordFailure(sourceUrl: string, reason: string): void {
    if (!this._failures.has(sourceUrl)) {
      this._failures.set(sourceUrl, { sourceUrl, reason });
    }
  }

  private async inlineLexical(serializedLexical: string): Promise<string> {
    const lexical: unknown = JSON.parse(serializedLexical);
    if (!isRecord(lexical) || !isRecord(lexical.root) || !Array.isArray(lexical.root.children)) {
      return serializedLexical;
    }

    await this.inlineLexicalChildren(lexical.root.children);
    return JSON.stringify(lexical);
  }

  private async inlineLexicalChildren(children: unknown[]): Promise<void> {
    for (const child of children) {
      if (!isRecord(child)) {
        continue;
      }

      const type = typeof child.type === 'string' ? child.type : '';
      for (const path of DIRECT_MEDIA_FIELDS[type] ?? []) {
        const value = getPath(child, path);
        if (typeof value === 'string' && value) {
          setPath(child, path, await this.inlineUrl(value));
        }
      }

      if (type === 'gallery' && Array.isArray(child.images)) {
        for (const image of child.images) {
          if (isRecord(image) && typeof image.src === 'string' && image.src) {
            image.src = await this.inlineUrl(image.src);
          }
        }
      }

      for (const path of HTML_MEDIA_FIELDS[type] ?? []) {
        const value = getPath(child, path);
        if (typeof value === 'string' && value) {
          setPath(child, path, await this.inlineHtml(value));
        }
      }

      for (const path of MARKDOWN_MEDIA_FIELDS[type] ?? []) {
        const value = getPath(child, path);
        if (typeof value === 'string' && value) {
          setPath(child, path, await this.inlineMarkdown(value));
        }
      }

      if (Array.isArray(child.children)) {
        await this.inlineLexicalChildren(child.children);
      }
    }
  }

  private async inlineHtml(html: string): Promise<string> {
    const $ = cheerio.load(html, { decodeEntities: false }, false);
    const attributes: Array<[string, string]> = [
      ['img[src]', 'src'],
      ['img[data-src]', 'data-src'],
      ['video[src]', 'src'],
      ['video[poster]', 'poster'],
      ['audio[src]', 'src'],
      ['source[src]', 'src'],
    ];

    for (const [selector, attribute] of attributes) {
      for (const element of $(selector).toArray()) {
        const value = $(element).attr(attribute);
        if (value) {
          $(element).attr(attribute, await this.inlineUrl(value));
        }
      }
    }

    for (const element of $('[srcset]').toArray()) {
      const value = $(element).attr('srcset');
      if (value) {
        $(element).attr('srcset', await this.inlineSrcset(value));
      }
    }

    for (const element of $('[style]').toArray()) {
      const value = $(element).attr('style');
      if (value) {
        $(element).attr('style', await this.inlineCss(value));
      }
    }

    for (const element of $('style').toArray()) {
      const value = $(element).html();
      if (value) {
        $(element).html(await this.inlineCss(value));
      }
    }

    return $.root().html() as string;
  }

  private async inlineSrcset(srcset: string): Promise<string> {
    if (srcset.trimStart().startsWith('data:')) {
      return srcset;
    }

    const candidates = srcset.split(',');
    const inlined: string[] = [];
    for (const candidate of candidates) {
      const match = candidate.match(/^(\s*)(\S+)(.*)$/s);
      if (!match) {
        inlined.push(candidate);
        continue;
      }
      const [, leading, sourceUrl, descriptor] = match;
      inlined.push(`${leading}${await this.inlineUrl(sourceUrl)}${descriptor}`);
    }
    return inlined.join(',');
  }

  private inlineCss(css: string): Promise<string> {
    return replaceAsync(css, /url\(\s*(?:(["'])(.*?)\1|([^)'"\s][^)]*?))\s*\)/gi, async (match) => {
      const sourceUrl = ((match[2] ?? match[3]) as string).trim();
      if (!sourceUrl) {
        return match[0];
      }
      const storedUrl = await this.inlineUrl(sourceUrl);
      return match[0].replace(sourceUrl, storedUrl);
    });
  }

  private async inlineMarkdown(markdown: string): Promise<string> {
    let result = await replaceAsync(
      markdown,
      /!\[[^\]]*]\(\s*(?:<([^>\s]+)>|((?:https?:)?\/\/[^\s)]+))(?=[\s)])/gi,
      async (match) => {
        const sourceUrl = (match[1] ?? match[2]) as string;
        return match[0].replace(sourceUrl, await this.inlineUrl(sourceUrl));
      },
    );

    result = await replaceAsync(result, /<(?:img|video|audio|source)\b[^>]*>/gi, async (match) =>
      this.inlineHtml(match[0]),
    );

    return replaceAsync(result, /<style\b[^>]*>[\s\S]*?<\/style>/gi, async (match) =>
      this.inlineHtml(match[0]),
    );
  }
}
