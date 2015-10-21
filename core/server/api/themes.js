// # Themes API
// RESTful API for Themes
var Promise            = require('bluebird'),
    _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    settings           = require('./settings'),
    pipeline           = require('../utils/pipeline'),
    utils              = require('./utils'),

    docName = 'themes',
    themes;

/**
 * ### Fetch Active Theme
 * @returns {Theme} theme
 */

function fetchActiveTheme() {
    return settings.read({
        key: 'activeTheme',
        context: {
            internal: true
        }
    }).then(function (response) {
        return response.settings[0].value;
    });
}

/**
 * ### Fetch Available Themes
 * @returns {Themes} themes
 */

function fetchAvailableThemes() {
    var themes = {};

    _.each(config.paths.availableThemes, function (theme, name) {
        var isTheme = name.indexOf('.') !== 0 && name !== '_messages' && name.toLowerCase() !== 'readme.md';

        if (!isTheme) {
            return;
        }

        themes[name] = theme;
    });

    return themes;
}

/**
 * ### Activate Theme
 * @param {Theme} theme
 * @returns {Object} response
 */

function activateTheme(theme) {
    return settings.edit({
        settings: [{
            key: 'activeTheme',
            value: theme.name
        }],
        context: {
            internal: true
        }
    }).then(function () {
        theme.active = true;

        return {themes: [theme]};
    });
}

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
        var tasks;

        /**
         * ### Model Query
         * @returns {Object} result
         */

        function modelQuery() {
            var result = {
                availableThemes: fetchAvailableThemes(),
                activeTheme: fetchActiveTheme()
            };

            return Promise.props(result);
        }

        /**
         * ### Build response
         * @param {Object} result - result from modelQuery()
         * @returns {Object} response
         */

        function buildResponse(result) {
            var themes = [];

            _.each(result.availableThemes, function (theme, name) {
                var item = {
                    active: result.activeTheme === name,
                    uuid: name
                };

                // if theme has package.json file,
                // merge its properties
                if (theme['package.json']) {
                    item = _.merge(item, theme['package.json']);
                }

                themes.push(item);
            });

            return {themes: themes};
        }

        tasks = [
            utils.validate(docName),
            utils.handlePublicPermissions(docName, 'browse'),
            modelQuery,
            buildResponse
        ];

        return pipeline(tasks, options || {});
    },

    /**
     * ### Edit
     * Change the active theme
     * @param {Theme} object
     * @param {{context}} options
     * @returns {Promise(Theme)}
     */
    edit: function edit(object, options) {
        var tasks, themeName;

        // Check whether the request is properly formatted.
        if (!_.isArray(object.themes)) {
            return Promise.reject(new errors.BadRequestError('Invalid request.'));
        }

        themeName = object.themes[0].uuid;

        /**
         * ### Model Query
         * @param {Object} options
         * @returns {Theme} theme
         */

        function modelQuery(options) {
            return themes.browse(options).then(function (response) {
                var theme = _.find(response.themes, function (theme) {
                    return theme.uuid === themeName;
                });

                if (!theme) {
                    return Promise.reject(new errors.BadRequestError('Theme does not exist.'));
                }

                if (!theme.name) {
                    theme.name = themeName;
                }

                return theme;
            });
        }

        tasks = [
            utils.validate(docName),
            utils.handlePermissions(docName, 'edit'),
            modelQuery,
            activateTheme
        ];

        return pipeline(tasks, options || {});
    }
};

module.exports = themes;
