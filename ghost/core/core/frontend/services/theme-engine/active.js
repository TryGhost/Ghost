/**
 * # Active Theme
 *
 * This file defines a class of active theme, and also controls the getting and setting a single instance, as there
 * can only ever be one active theme. Unlike a singleton, the active theme can change, however only in a controlled way.
 *
 * There are several different patterns available for keeping data private. Elsewhere in Ghost we use the
 * naming convention of the _ prefix. Even though this has the downside of not being truly private, it is still one
 * of the preferred options for keeping data private with the new class syntax, therefore I have kept it.
 *
 * No properties marked with an _ should be used directly.
 *
 */
const join = require('path').join;

const _ = require('lodash');
const themeConfig = require('./config');
const config = require('../../../shared/config');
const engine = require('./engine');
const themeI18n = require('./i18n');

// Current instance of ActiveTheme
let currentActiveTheme;

class ActiveTheme {
    /**
     * @TODO this API needs to be simpler, but for now should work!
     * @param {object} settings
     * @param {string} settings.locale - the active locale for i18n
     * @param {object} loadedTheme - the loaded theme object from the theme list
     * @param {object} checkedTheme - the result of gscan.format for the theme we're activating
     */
    constructor(settings, loadedTheme, checkedTheme) {
        // Assign some data, mark it all as pseudo-private
        this._name = loadedTheme.name;
        this._path = loadedTheme.path;
        this._mounted = false;

        // We get passed in a locale
        this._locale = settings.locale || 'en';

        // @TODO: get gscan to return validated, useful package.json fields for us!
        this._packageInfo = loadedTheme['package.json'];
        this._partials = checkedTheme.partials;

        // all custom .hbs templates (e.g. custom-about)
        this._customTemplates = checkedTheme.templates.custom;

        // all .hbs templates
        this._templates = checkedTheme.templates.all;

        // Create a theme config object
        this._config = themeConfig.create(this._packageInfo);

        this.initI18n();
    }

    get name() {
        return this._name;
    }

    get customTemplates() {
        return this._customTemplates;
    }

    get path() {
        return this._path;
    }

    get partialsPath() {
        return this._partials.length > 0 ? join(this.path, 'partials') : null;
    }

    get mounted() {
        return this._mounted;
    }

    get error() {
        return this._error;
    }

    hasTemplate(templateName) {
        return this._templates.indexOf(templateName) > -1;
    }

    updateTemplateOptions(options) {
        engine.updateTemplateOptions(_.merge({}, engine.getTemplateOptions(), options));
    }

    config(key) {
        return this._config[key];
    }

    /**
     *
     * @param {object} options
     * @param {string} [options.activeTheme]
     * @param {string} [options.locale]
     */
    initI18n(options = {}) {
        options.activeTheme = options.activeTheme || this._name;
        options.locale = options.locale || this._locale;

        themeI18n.init(options);
    }

    mount(siteApp) {
        // reset the asset hash
        // @TODO: set this on the theme instead of globally, or use proper file-based hash
        config.set('assetHash', null);
        // clear the view cache
        siteApp.cache = {};
        // Set the views and engine
        siteApp.set('views', this.path);
        siteApp.engine('hbs', engine.configure(this.partialsPath, this.path));

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
     * @param {object} settings
     * @param {string} settings.locale - the active locale for i18n
     * @param {object} loadedTheme - the loaded theme object from the theme list
     * @param {object} checkedTheme - the result of gscan.format for the theme we're activating
     * @return {ActiveTheme}
     */
    set(settings, loadedTheme, checkedTheme) {
        currentActiveTheme = new ActiveTheme(settings, loadedTheme, checkedTheme);
        return currentActiveTheme;
    }
};
