// # Themes API
// RESTful API for Themes
var when               = require('when'),
    _                  = require('lodash'),
    canThis            = require('../permissions').canThis,
    config             = require('../config'),
    errors             = require('../errors'),
    settings           = require('./settings'),
    when               = require('when'),
    themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
    /**
     * ### Browse
     * Get a list of all the available themes
     * @param {{context}} options
     * @returns {Promise(Themes)}
     */
    browse: function browse(options) {
        options = options || {};

        return canThis(options.context).browse.theme().then(function () {
            return when.all([
                settings.read({key: 'activeTheme', context: {internal: true}}),
                config.paths.availableThemes
            ]).then(function (result) {
                var activeTheme = result[0].settings[0].value,
                    availableThemes = result[1],
                    themes = [],
                    themeKeys = Object.keys(availableThemes);

                _.each(themeKeys, function (key) {
                    if (key.indexOf('.') !== 0
                            && key !== '_messages'
                            && key !== 'README.md'
                            ) {

                        var item = {
                            uuid: key
                        };

                        if (availableThemes[key].hasOwnProperty('package.json')) {
                            item = _.merge(item, availableThemes[key]['package.json']);
                        }

                        item.active = item.uuid === activeTheme;

                        themes.push(item);
                    }
                });

                return { themes: themes };
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to browse themes.'));
        });
    },

    /**
     * ### Edit
     * Change the active theme
     * @param {Theme} object
     * @param {{context}} options
     * @returns {Promise(Theme)}
     */
    edit: function edit(object, options) {
        var themeName;

        // Check whether the request is properly formatted.
        if (!_.isArray(object.themes)) {
            return when.reject({type: 'BadRequest', message: 'Invalid request.'});
        }

        themeName = object.themes[0].uuid;

        return canThis(options.context).edit.theme().then(function () {
            return themes.browse(options).then(function (availableThemes) {
                var theme;

                // Check if the theme exists
                theme = _.find(availableThemes.themes, function (currentTheme) {
                    return currentTheme.uuid === themeName;
                });

                if (!theme) {
                    return when.reject(new errors.BadRequestError('Theme does not exist.'));
                }

                // Activate the theme
                return settings.edit(
                    {settings: [{ key: 'activeTheme', value: themeName }]}, {context: {internal: true }}
                ).then(function () {
                    theme.active = true;
                    return { themes: [theme]};
                });
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to edit themes.'));
        });
    }
};

module.exports = themes;
