import { isRecommendationUrl, PATH_SUFFIX } from '../entities/recommendation-url.value';

/**
 * The site a recommendations file belongs to: the URL of a
 * `/.well-known/recommendations.json` file with that suffix removed. Any other
 * URL gives undefined.
 *
 * Mentions adds this to its own URL mappers, so the domain registers nothing on
 * another service while it starts.
 */
export function resolveRecommendationUrl(url: URL): URL | undefined {
  if (!isRecommendationUrl(url)) {
    return undefined;
  }
  const site = new URL(url.toString());
  site.pathname = site.pathname.slice(0, -PATH_SUFFIX.length);
  return site;
}
