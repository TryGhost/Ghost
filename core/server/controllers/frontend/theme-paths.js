var config = require('../../config');

/**
 * Returns the paths object of the active theme via way of a promise.
 * @return {Promise} The promise resolves with the value of the paths.
 */
function getActiveThemePaths(req) {
    var activeTheme = req.app.get('activeTheme'),
        paths = config.paths.availableThemes[activeTheme];

    return paths;
}

module.exports = getActiveThemePaths;
