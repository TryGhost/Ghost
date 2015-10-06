/**
 * Dependencies
 */

var readDirectory = require('./read-directory'),
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

    return readDirectory(dir)
        .tap(function (themes) {
            _.each(themes, function (theme, name) {
                var hasPackageJson, warning;

                hasPackageJson = !!theme['package.json'];

                if (!hasPackageJson) {
                    warning = {
                        message: 'Found a theme with no package.json file',
                        context: 'Theme name: ' + name,
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
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
