/**
 * What Ghost can learn about a page on another site: its oEmbed data, or
 * failing that the metadata read from the page itself. The fields present
 * depend on the page and on what was asked for, so only the common ones are
 * named.
 */
export interface ExternalPageDescription {
  readonly version?: string;
  readonly type?: string;
  readonly url?: string;
  readonly metadata?: {
    readonly title?: string | null;
    readonly description?: string | null;
    readonly publisher?: string | null;
    readonly author?: string | null;
    readonly thumbnail?: string | null;
    readonly icon?: string | null;
  };
  readonly [field: string]: unknown;
}

export interface DescribeExternalPageOptions {
  /**
   * What the description is for. 'mention' returns metadata without storing any
   * image, which suits pages a third party can make Ghost look at.
   */
  readonly type?: 'mention' | 'bookmark' | 'embed';
  /** How long to wait for the other site, in milliseconds. */
  readonly timeout?: { readonly request: number };
}

/** A page fetched from another site and decoded to text. */
export interface ExternalPageHtml {
  /** The URL the page was served from, after redirects. */
  readonly url: string;
  readonly body: string;
  readonly contentType: string | undefined;
}

export interface FetchExternalPageHtmlOptions {
  readonly timeout?: { readonly request: number };
  readonly retry?: { readonly limit: number };
}
