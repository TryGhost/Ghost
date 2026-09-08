const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

const AUTO_EXCERPT_LENGTH = 500;

/**
 * Deterministic automatic excerpt from stored plaintext.
 * Matches the Posts API excerpt fallback (custom_excerpt still wins at read time).
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null}
 */
function computeAutoExcerpt(plaintext) {
  if (!plaintext) {
    return null;
  }

  return plaintext.substring(0, AUTO_EXCERPT_LENGTH);
}

/**
 * Deterministic reading-time estimate from HTML (+ feature image).
 * Matches the Posts API serializer: feature image counts as one additional image.
 *
 * @param {string|null|undefined} html
 * @param {string|null|undefined} featureImage
 * @returns {number|null}
 */
function computeReadingTime(html, featureImage) {
  if (!html) {
    return null;
  }

  const additionalImages = featureImage ? 1 : 0;
  return readingMinutes(html, additionalImages);
}

module.exports = {
  AUTO_EXCERPT_LENGTH,
  computeAutoExcerpt,
  computeReadingTime,
};
