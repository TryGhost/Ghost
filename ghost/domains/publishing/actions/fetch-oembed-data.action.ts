import type { Site } from '#support/site';
import { oembedService } from '../../../shared/transition/oembed-service';

/** Describes an external page from its address: its title, description, author, images and embed. */
export function fetchOembedData(
  site: Site,
  url: string,
  type: string,
  options?: { timeout?: number | { request: number } },
) {
  return oembedService(site).fetchOembedDataFromUrl(url, type, options);
}
