import { isRecommendationUrl, PATH_SUFFIX } from '../entities/recommendation-url.value';

/**
 * A recommendation arrives as a webmention from a site's recommendations file.
 * This gives the address to describe in its place: the site itself.
 */
export function mapRecommendationSource(url: URL): URL | undefined {
  if (!isRecommendationUrl(url)) {
    return undefined;
  }
  const mapped = new URL(url.toString());
  mapped.pathname = mapped.pathname.slice(0, -PATH_SUFFIX.length);
  return mapped;
}
