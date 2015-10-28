/**
 * Dependencies
 */

var readThemes = require('./read-themes'),
    Promise = require('bluebird'),
    _ = require('lodash');

/**
 * Validate themes:
 *
 *   1. Check if theme has package.json
 */

function validateThemes(dir) {
    var result = {
        warnings: [],
        errors: []
    };

    return readThemes(dir)
        .tap(function (themes) {
            _.each(themes, function (theme, name) {
                var hasPackageJson, warning;

                hasPackageJson = theme['package.json'] !== undefined;

                if (!hasPackageJson) {
                    warning = {
                        message: 'Found a theme with no package.json file',
                        context: 'Theme name: ' + name,
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                    };

                    result.warnings.push(warning);
                }

                // if package.json is `null`, it means that it exists
                // but JSON.parse failed (invalid json syntax)
                if (hasPackageJson && theme['package.json'] === null) {
                    warning = {
                        message: 'Found a malformed package.json',
                        context: 'Theme name: ' + name,
                        help: 'Valid package.json will be required in future. Please see http://docs.ghost.org/themes/'
                    };

                    result.warnings.push(warning);
                }
            });
        })
        .then(function () {
            var hasNotifications = result.warnings.length || result.errors.length;

            if (hasNotifications) {
                return Promise.reject(result);
            }
        });
}

/**
 * Expose `validateThemes`
 */

module.exports = validateThemes;
