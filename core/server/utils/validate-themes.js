/**
 * Dependencies
 */

var readThemes = require('./read-themes'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    i18n = require('../i18n');

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
                        message: i18n.t('errors.utils.validatethemes.themeWithNoPackage.message'),
                        context: i18n.t('errors.utils.validatethemes.themeWithNoPackage.context', {name: name}),
                        help: i18n.t('errors.utils.validatethemes.themeWithNoPackage.help', {url: 'http://docs.ghost.org/themes/'})
                    };

                    result.warnings.push(warning);
                }

                // if package.json is `null`, it means that it exists
                // but JSON.parse failed (invalid json syntax)
                if (hasPackageJson && theme['package.json'] === null) {
                    warning = {
                        message: i18n.t('errors.utils.validatethemes.malformedPackage.message'),
                        context: i18n.t('errors.utils.validatethemes.malformedPackage.context', {name: name}),
                        help: i18n.t('errors.utils.validatethemes.malformedPackage.help', {url: 'http://docs.ghost.org/themes/'})
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
