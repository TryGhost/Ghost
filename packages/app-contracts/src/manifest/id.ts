/** Matches the limit of the index that ties saved cards to an app. */
export const APP_ID_MAX_LENGTH = 191;

const ID_SEGMENT = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * An app ID is reverse-domain style: at least two dot-separated segments of lowercase
 * letters, digits and hyphens, starting with a letter so that an IP address or a version
 * number is not an ID. IDs are compared exactly, so an uppercase ID is invalid rather than
 * lowercased.
 */
export function isValidAppId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > APP_ID_MAX_LENGTH) {
    return false;
  }
  const segments = value.split('.');
  return (
    segments.length >= 2 &&
    /^[a-z]/.test(value) &&
    segments.every((segment) => ID_SEGMENT.test(segment))
  );
}
