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

config.env = {
    testing: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-test.db')
            }
        },
        url: {
            host: '127.0.0.1',
            port: '2368'
        }
    },

    travis: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-travis.db')
            }
        },
        url: {
            host: '127.0.0.1',
            port: '2368'
        }
    },

    development: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-dev.db')
            },
            debug: false
        },
        url: {
            host: '127.0.0.1',
            port: '2368'
        }
    },

    staging: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-staging.db')
            },
            debug: false
        },
        url: {
            host: '127.0.0.1',
            port: '2368'
        }
    },

    production: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost.db')
            },
            debug: false
        },
        url: {
            host: '127.0.0.1',
            port: '2368'
        }
    }
};

/**
 * @property {Object} exports
 */
module.exports = config;