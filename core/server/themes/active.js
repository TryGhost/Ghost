'use strict';

/**
 * # Active Theme
 *
 * This file defines a class of active theme, and also controls the getting and setting a single instance, as there
 * can only ever be one active theme. Unlike a singleton, the active theme can change, however only in a controlled way.
 *
 * I've made use of the new class & constructor syntax here, as we are now only supporting Node v4 and above, which has
 * full support for these features.
 *
 * There are several different patterns available for keeping data private. Elsewhere in Ghost we use the
 * naming convention of the _ prefix. Even though this has the downside of not being truly private, it is still one
 * of the preferred options for keeping data private with the new class syntax, therefore I have kept it.
 *
 * No properties marked with an _ should be used directly.
 *
 */
var _ = require('lodash'),
    join = require('path').join,
    defaultConfig = require('./defaults.json'),
    config = require('../config'),
    // @TODO: remove this require
    hbs = require('express-hbs'),
    // Current instance of ActiveTheme
    currentActiveTheme;

// @TODO: will clean this code up later, honest! (and add tests)
function tempConfigHandler(packageJson) {
    var config = _.cloneDeep(defaultConfig),
        allowedKeys = ['posts_per_page'];

    if (packageJson && packageJson.hasOwnProperty('config')) {
        config = _.assign(config, _.pick(packageJson.config, allowedKeys));
    }

    return config;
}

class ActiveTheme {
    /**
     * @TODO this API needs to be simpler, but for now should work!
     * @param {object} loadedTheme - the loaded theme object from the theme list
     * @param {object} checkedTheme - the result of gscan.format for the theme we're activating
     */
    constructor(loadedTheme, checkedTheme) {
        // Assign some data, mark it all as pseudo-private
        this._name = loadedTheme.name;
        this._path = loadedTheme.path;
        this._mounted = false;

        // @TODO: get gscan to return validated, useful package.json fields for us!
        this._packageInfo = loadedTheme['package.json'];
        this._partials = checkedTheme.partials;
        // @TODO: get gscan to return a template collection for us
        this._templates = _.reduce(checkedTheme.files, function (templates, entry) {
            var tplMatch = entry.file.match(/(^[^\/]+).hbs$/);
            if (tplMatch) {
                templates.push(tplMatch[1]);
            }
            return templates;
        }, []);

        // Do something with config here
        this._config = tempConfigHandler(this._packageInfo);
    }

    get name() {
        return this._name;
    }

    get path() {
        return this._path;
    }

    get partialsPath() {
        return join(this.path, 'partials');
    }

    get mounted() {
        return this._mounted;
    }

    hasPartials() {
        return this._partials.length > 0;
    }

    hasTemplate(templateName) {
        return this._templates.indexOf(templateName) > -1;
    }

    config(key) {
        return this._config[key];
    }

    mount(blogApp) {
        let hbsOptions = {
            partialsDir: [config.get('paths').helperTemplates],
            onCompile: function onCompile(exhbs, source) {
                return exhbs.handlebars.compile(source, {preventIndent: true});
            }
        };

        if (this.hasPartials()) {
            hbsOptions.partialsDir.push(this.partialsPath);
        }

        // reset the asset hash
        // @TODO: set this on the theme instead of globally, or use proper file-based hash
        config.set('assetHash', null);
        // clear the view cache
        blogApp.cache = {};
        // Set the views and engine
        blogApp.set('views', this.path);
        blogApp.engine('hbs', hbs.express3(hbsOptions));

        this._mounted = true;
    }
}

module.exports = {
    get() {
        return currentActiveTheme;
    },
    /**
     * Set theme
     *
     * At this point we trust that the theme has been validated.
     * Any handling for invalid themes should happen before we get here
     *
     * @TODO this API needs to be simpler, but for now should work!
     * @param {object} loadedTheme - the loaded theme object from the theme list
     * @param {object} checkedTheme - the result of gscan.format for the theme we're activating
     * @return {ActiveTheme}
     */
    set(loadedTheme, checkedTheme) {
        currentActiveTheme = new ActiveTheme(loadedTheme, checkedTheme);
        return currentActiveTheme;
    }
};
