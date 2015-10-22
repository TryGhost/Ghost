var api         = require('../../api'),
    config      = require('../../config');

/**
 * Returns the paths object of the active theme via way of a promise.
 * @return {Promise} The promise resolves with the value of the paths.
 */
function getActiveThemePaths() {
    return api.settings.read({
        key: 'activeTheme',
        context: {
            internal: true
        }
    }).then(function then(response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value];

        return paths;
    });
}

module.exports = getActiveThemePaths;
