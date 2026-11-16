import type {
  DescribeExternalPageOptions,
  ExternalPageDescription,
} from '../data/external-page.data';
import oembed from '../transition/services/oembed';

/**
 * Describes the page at a URL on another site: its oEmbed data when its site is
 * a known provider, otherwise the metadata read from the page.
 */
export async function describeExternalPage(
  url: string,
  { type, ...options }: DescribeExternalPageOptions = {},
): Promise<ExternalPageDescription | undefined> {
  // The service is found now, when the page is described, not when this file is imported.
  const service = oembed.service;
  // Without options the service is called as its callers always called it.
  return Object.keys(options).length
    ? service.fetchOembedDataFromUrl(url, type, options)
    : service.fetchOembedDataFromUrl(url, type);
}
