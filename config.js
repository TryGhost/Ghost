// # Ghost Configuration

/**
 * global module
 **/
var path = require('path'),
    config;

/**
 * @module config
 * @type {Object}
 */
config = {};

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

// Current active theme
/**
 * @property {string} activeTheme
 */
config.activeTheme = 'casper';


config.activePlugins = [
    'fancyFirstChar.js'
];

// Default Navigation Items
/**
 * @property {Array} nav
 */
config.nav = [{
    title: 'Home',
    url: '/'
}];

config.database = {
    testing: {
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, '/core/shared/data/tests.db')
        }
    },

    travis: {
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, '/core/shared/data/tests.db')
        }
        // debug: true
    },

    development: {
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, '/core/shared/data/testdb.db')
        },
        debug: false
        // debug: true
    },

    staging: {},

    production: {}
};

/**
 * @property {Object} exports
 */
module.exports = config;