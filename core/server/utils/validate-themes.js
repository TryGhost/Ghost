/**
 * Dependencies
 */

var readThemes = require('./read-themes'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    path = require('path');

/**
 * Validate themes:
 *
 *   1. Check if theme has package.json
 *   2. Check if all partials are unique and do not shadow others.
 */

function validateThemes(dir) {
    var result = {
        warnings: [],
        errors: []
    };

    function packagePresentCheck(theme, name, result) {
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
    }

    function ambiguousPartialCheck(theme, name, result) {
        var partials, partialsHistogram, isUnique, warning;

        if (_.isUndefined(theme.partials)) {
            return;
        }

        partials = _.keys(theme.partials);
        partialsHistogram = _(partials)
            .map(function (key) { return path.basename(key, path.extname(key)); })
            .countBy(_.identity).value();

        _.each(partialsHistogram, function (count, partial) {
            isUnique = count < 2;

            if (isUnique) {
                return;
            }

            warning = {
                message: 'Found a partial (' + partial + ') that is not unique',
                context: 'Theme name: ' + name,
                help: 'Check for files sharing the same name but different extensions.'
            };

            result.warnings.push(warning);
        });
    }

    return readThemes(dir)
        .tap(function (themes) {
            _.each(themes, function (theme, name) {
                packagePresentCheck(theme, name, result);
                ambiguousPartialCheck(theme, name, result);
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
