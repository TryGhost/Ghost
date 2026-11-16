import type { ExternalPageHtml, FetchExternalPageHtmlOptions } from '../data/external-page.data';
import oembed from '../transition/services/oembed';

/** Fetches a page from another site and decodes it to text, whatever its encoding. */
export async function fetchExternalPageHtml(
  url: string,
  options?: FetchExternalPageHtmlOptions,
): Promise<ExternalPageHtml> {
  const service = oembed.service;
  const {
    url: pageUrl,
    body,
    contentType,
  } = options ? await service.fetchPageHtml(url, { ...options }) : await service.fetchPageHtml(url);
  // Plain data: only the three fields, whatever the service returns.
  return { url: pageUrl, body, contentType };
}
