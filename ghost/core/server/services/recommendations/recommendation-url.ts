export const PATH_SUFFIX = '/.well-known/recommendations.json';

export function isRecommendationUrl(url: URL): boolean {
  return url.pathname.endsWith(PATH_SUFFIX);
}

/**
 * Where a recommendation came from: the site that published the recommendations file the URL
 * points at. Mentions asks for metadata about that site, not the file. Returns nothing for any
 * other URL.
 */
export function recommendationSourceUrl(url: URL): URL | undefined {
  if (!isRecommendationUrl(url)) {
    return undefined;
  }
  const source = new URL(url.toString());
  source.pathname = source.pathname.slice(0, -PATH_SUFFIX.length);
  return source;
}
