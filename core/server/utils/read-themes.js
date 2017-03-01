/**
 * # Read Themes
 *
 * Util that wraps packages.read
 */
var _ = require('lodash'),
    packages = require('../utils/packages'),
    Promise = require('bluebird'),
    join = require('path').join,
    errors = require('../errors'),
    i18n = require('../i18n'),

    glob = Promise.promisify(require('glob'));

function populateTemplates(themes) {
    return Promise
        // Load templates for each theme in the object
        .each(Object.keys(themes), function loadTemplates(themeName) {
            // Load all the files which match x.hbs = top level templates
            return glob('*.hbs', {cwd: themes[themeName].path})
                .then(function gotTemplates(templates) {
                    // Update the original themes object
                    _.each(templates, function (template) {
                        themes[themeName][template] = join(themes[themeName].path, template);
                    });
                });
        })
        // Return the original (now updated) object, not the result of Promise.each
        .return(themes);
}

/**
 * Read active theme
 */
function readActiveTheme(dir, name) {
    return packages
        .read.one(dir, name)
        .then(populateTemplates)
        .catch(function () {
            // For now we return an empty object as this is not fatal unless the frontend of the blog is requested
            errors.logWarn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: name}));
            return {};
        });
}

/**
 * Read themes
 */
function readThemes(dir) {
    return packages
        .read.all(dir)
        .then(populateTemplates);
}

/**
 * Expose `read-themes`
 */

module.exports = readThemes;
module.exports.active = readActiveTheme;
