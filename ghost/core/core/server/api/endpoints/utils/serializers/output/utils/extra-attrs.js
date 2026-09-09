const labs = require('../../../../../../../shared/labs');
const { computeAutoExcerpt, computeReadingTime } = require('../../../../../../lib/post-meta');

/**
 * Automatic excerpt for API output.
 * When storedPostMetadata is on, prefer the persisted column; fall back to the
 * plaintext slice when still null (partial backfill / fixture holes).
 * When off, keep today's request-time plaintext slice.
 *
 * @param {import('../../../../../../models/post')} model
 * @returns {string|null}
 */
function resolveAutoExcerpt(model) {
  if (labs.isSet('storedPostMetadata')) {
    const stored = model.get('auto_excerpt');
    if (stored !== null && stored !== undefined) {
      return stored;
    }
  }

  return computeAutoExcerpt(model.get('plaintext'));
}

module.exports.resolveAutoExcerpt = resolveAutoExcerpt;

/**
 *
 * @param {Object} options - frame options
 * @param {import('../../../../../../models/post')} model - Bookshelf model of Post
 * @param {Object} attrs - JSON object of Post
 * @returns {void} - modifies attrs
 */
module.exports.forPost = (options, model, attrs) => {
  // requested via `columns`
  const columnsIncludesCustomExcerpt = options.columns?.includes('custom_excerpt');
  const columnsIncludesExcerpt = options.columns?.includes('excerpt');
  const columnsIncludesPlaintext = options.columns?.includes('plaintext');
  const columnsIncludesReadingTime = options.columns?.includes('reading_time');

  // requested via `formats`
  const formatsIncludesPlaintext = options.formats?.includes('plaintext');

  // no columns requested
  const noColumnsRequested = !Object.prototype.hasOwnProperty.call(options, 'columns');
  const useStoredPostMetadata = labs.isSet('storedPostMetadata');

  // 1. Gets excerpt from post's plaintext. If custom_excerpt exists, it overrides the excerpt but the key remains excerpt.
  if (columnsIncludesExcerpt) {
    if (!attrs.custom_excerpt) {
      attrs.excerpt = resolveAutoExcerpt(model);
    } else {
      attrs.excerpt = attrs.custom_excerpt;
    }

    if (!columnsIncludesCustomExcerpt) {
      delete attrs.custom_excerpt;
    }
  }

  if (columnsIncludesPlaintext || formatsIncludesPlaintext) {
    let plaintext = model.get('plaintext');
    if (plaintext) {
      attrs.plaintext = plaintext;
    } else {
      delete attrs.plaintext;
    }
  }

  // 3. Displays excerpt if no columns was requested - specifically needed for the Admin Posts API
  if (noColumnsRequested) {
    let customExcerpt = model.get('custom_excerpt');

    if (customExcerpt !== null) {
      attrs.excerpt = customExcerpt;
    } else {
      attrs.excerpt = resolveAutoExcerpt(model);
    }
  }

  // 4. Add `reading_time` if no columns were requested, or if `reading_time` was requested via `columns`
  // reading_time is also a DB column now; drop the raw value so we only expose it when
  // we intentionally return a stored or computed value (avoids leaking `reading_time: null`).
  const storedReadingTime = attrs.reading_time;
  delete attrs.reading_time;
  if (noColumnsRequested || columnsIncludesReadingTime) {
    if (useStoredPostMetadata && storedReadingTime !== null && storedReadingTime !== undefined) {
      // Prefer persisted value even when html was not selected (enables later query narrowing).
      attrs.reading_time = storedReadingTime;
    } else if (attrs.html) {
      // Flag off, or stored null during partial backfill — compute from html.
      attrs.reading_time = computeReadingTime(attrs.html, attrs.feature_image);
    }
  }

  // html is stripped by the formats keep-list when not requested; feature_image is not a
  // format, so drop it when it was only force-loaded for reading_time compute fallback.
  if (columnsIncludesReadingTime && options.columns && !options.columns.includes('feature_image')) {
    delete attrs.feature_image;
  }
};
