// # Ghost Configuration

/**
 * global module
 **/
(function () {
    "use strict";

    /**
     * @module config
     * @type {Object}
     */
    var config = {};

    // ## Admin settings

    /**
     * @property {string} defaultLang
     */
    config.defaultLang = 'en';

    /**
     * @property {boolean} forceI18n
     */
    config.forceI18n = true;

    // ## Themes

    /**
     * @property {string} themeDir
     */

    // Themes
    config.themeDir = 'themes';

    /**
     * @property {string} activeTheme
     */
    config.activeTheme = 'casper';

    // ## Homepage settings
    /**
     * @module homepage
     * @type {Object}
     */
    config.homepage = {};

    /**
     * @property {number} features
     */
    config.homepage.features = 1;

    /**
     * @property {number} posts
     */
    config.homepage.posts = 4;

    /**
     * @property {Object} exports
     */
    module.exports = config;
}());