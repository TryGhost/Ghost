/**
 * # Read Themes
 *
 * Util that wraps packages.read
 */
var packages = require('../utils/packages');

/**
 * Read active theme
 */
function readActiveTheme(dir, name) {
    return packages.read.one(dir, name);
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
