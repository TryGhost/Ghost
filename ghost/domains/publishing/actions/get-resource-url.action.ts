import type { Site } from '#support/site';
import { urlService } from '../../../shared/transition/url-service';

/** The public address of a post, page, tag or author, or null when it has none. */
export function getResourceUrl(
  site: Site,
  resource: Record<string, unknown>,
  options: { absolute: boolean },
): string | null {
  return urlService(site).getUrlForResource(resource, options);
}
