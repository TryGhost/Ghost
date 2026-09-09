import { utils } from '@tryghost/helpers';

const { readingMinutes } = utils;

export const AUTO_EXCERPT_LENGTH = 500;

/**
 * Deterministic automatic excerpt from stored plaintext.
 * Matches the Posts API excerpt fallback (custom_excerpt still wins at read time).
 */
export function computeAutoExcerpt(plaintext: string | null | undefined): string | null {
  if (!plaintext) {
    return null;
  }

  return plaintext.substring(0, AUTO_EXCERPT_LENGTH);
}

/**
 * Deterministic reading-time estimate from HTML (+ feature image).
 * Matches the Posts API serializer: feature image counts as one additional image.
 */
export function computeReadingTime(
  html: string | null | undefined,
  featureImage: string | null | undefined,
): number | null {
  if (!html) {
    return null;
  }

  const additionalImages = featureImage ? 1 : 0;
  return readingMinutes(html, additionalImages);
}
