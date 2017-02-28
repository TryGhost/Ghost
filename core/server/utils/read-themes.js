/**
 * # Read Themes
 *
 * Util that wraps packages.read
 */
var packages = require('../utils/packages'),
    errors = require('../errors'),
    i18n = require('../i18n');

/**
 * Read active theme
 */
function readActiveTheme(dir, name) {
    return packages
        .read.one(dir, name)
        .catch(function () {
            // For now we return an empty object as this is not fatal unless the frontend of the blog is requested
            errors.logWarn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: name}));
            return {};
        });
}

/**
 * Read themes
 */
function readThemes(dir) {
    return packages.read.all(dir);
}

/**
 * Expose `read-themes`
 */

module.exports = readThemes;
module.exports.active = readActiveTheme;
