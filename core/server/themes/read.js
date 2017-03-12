/**
 * # Read Themes
 *
 * Util that wraps packages.read
 */
var packages = require('../utils/packages'),

    readOneTheme,
    readAllThemes;

readOneTheme = function readOneTheme(dir, name) {
    return packages.read.one(dir, name);
};

readAllThemes = function readAllThemes(dir) {
    return packages.read.all(dir);
};

/**
 * Expose public API
 */

module.exports.all = readAllThemes;
module.exports.one = readOneTheme;
