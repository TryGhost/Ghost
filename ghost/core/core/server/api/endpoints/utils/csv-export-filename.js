const {slugify} = require('@tryghost/string');
const settingsCache = require('../../../../shared/settings-cache');

/**
 * Builds the filename for a CSV export, prefixed with the slugified site title
 * so exports are identifiable across multiple Ghost instances, e.g.
 * `my-site.ghost.members.2024-01-01.csv`.
 *
 * This is the single source of truth for export filenames: the API sets it on
 * the `Content-Disposition` header and the admin client reads it back from that
 * header, so the convention only needs to live here.
 *
 * Falls back to `ghost.<type>.<date>.csv` when the site title is missing or
 * slugifies to an empty string.
 *
 * @param {string} type - The export type, e.g. `members` or `analytics`.
 * @returns {string}
 */
function getCSVExportFileName(type) {
    const datetime = (new Date()).toJSON().substring(0, 10);
    const slug = slugify(settingsCache.get('title') || '');
    const titlePrefix = slug ? `${slug}.` : '';

    return `${titlePrefix}ghost.${type}.${datetime}.csv`;
}

module.exports = {
    getCSVExportFileName
};
