const { slugify } = require('@tryghost/string');
const settingsCache = require('../../../../shared/settings-cache');

/**
 * Builds an export filename prefixed with the slugified site title, e.g.
 * `my-site.ghost.members.2024-01-01.csv` (falling back to `ghost.<type>.<date>.<ext>`
 * when the title is empty or slugifies to nothing).
 *
 * Single source of truth: the API sets this on `Content-Disposition` and the
 * admin client reads it back, so the convention only lives here.
 *
 * @param {string} type - The export type, e.g. `members`, `analytics` or `export`.
 * @param {string} extension - The file extension, e.g. `csv` or `zip`.
 * @returns {string}
 */
function getExportFileName(type, extension) {
  const datetime = new Date().toJSON().substring(0, 10);
  const slug = slugify(settingsCache.get('title') || '');
  const titlePrefix = slug ? `${slug}.` : '';

  return `${titlePrefix}ghost.${type}.${datetime}.${extension}`;
}

/**
 * @param {string} type - The export type, e.g. `members` or `analytics`.
 * @returns {string}
 */
function getCSVExportFileName(type) {
  return getExportFileName(type, 'csv');
}

module.exports = {
  getCSVExportFileName,
  getExportFileName,
};
