var _       = require('lodash'),
    Promise = require('bluebird'),
    glob    = Promise.promisify(require('glob')),
    path    = require('path'),

    parsePackageJson = require('./parse-package-json');

function loadThemes(themePath) {
    // Start with clean messages, pass down along traversal
    var messages = {
        errors: [],
        warnings: []
    },
    options = {follow: true},
    paths,
    themePaths,
    themes = {};
    // First path reads directories
    paths = [
        // Find theme folders
        glob(path.join(themePath, '*/'), options),
        // Find templates
        glob(path.join(themePath, '*', '*.hbs'), options),
        // Find package.json
        glob(path.join(themePath, '*', 'package.json'), options)
    ];

    return Promise.all(paths).then(function (resolvedPaths) {
        themePaths = resolvedPaths;
        var loadPromises = _.map(themePaths[2], function (packageJsonPath) {
            var themeName = path.basename(path.dirname(packageJsonPath));

            themes[themeName] = {};
            return parsePackageJson(packageJsonPath, messages).then(function (data) {
                themes[themeName]['package.json'] = data;
            });
        });

        return Promise.all(loadPromises);
    }).then(function () {
        // Identify themes without a package.json
        _.each(themePaths[0], function (themeFolder) {
            var name = path.basename(themeFolder);
            if (!_.include(_.keys(themes), name)) {
                messages.warnings.push({
                    message: 'Found a theme with no package.json file',
                    context: 'Theme name: ' + name,
                    help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                });
                themes[name] = {};
            }
        });

        // Add all templates to theme object.
        _.each(themePaths[1], function (template) {
            var name = path.basename(template),
                theme;

            theme = path.basename(path.dirname(template));
            themes[theme] = themes[theme] || {};
            themes[theme][name] = template;
        });
        themes._messages = messages;
        return themes;
    });
}

module.exports = loadThemes;
