export const PATH_SUFFIX = '/.well-known/recommendations.json';

export function isRecommendationUrl(url: URL): boolean {
  return url.pathname.endsWith(PATH_SUFFIX);
}
