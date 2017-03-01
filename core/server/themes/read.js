/**
 * # Read Themes
 *
 * Util that wraps packages.read
 */
var packages = require('../utils/packages'),
    logging = require('../logging'),
    i18n = require('../i18n'),

    readOneTheme,
    readAllThemes;

readOneTheme = function readOneTheme(dir, name) {
    return packages
        .read.one(dir, name)
        .catch(function () {
            // For now we return an empty object as this is not fatal unless the frontend of the blog is requested
            logging.warn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: name}));
            return {};
        });
};

readAllThemes = function readAllThemes(dir) {
    return packages.read.all(dir);
};

/**
 * Expose public API
 */

module.exports.all = readAllThemes;
module.exports.one = readOneTheme;
