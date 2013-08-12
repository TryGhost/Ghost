// # Ghost Configuration

var path = require('path'),
    config  = {};

// ## Admin settings

// Default language
config.defaultLang = 'en';

// Force i18n to be on
config.forceI18n = true;

// ## Themes & Plugins

// Current active theme
config.activeTheme = 'casper';

// Current active plugins
config.activePlugins = [
    'FancyFirstChar'
];

// ## Default Navigation Items
// Add new objects here to extend the menu output by {{nav}}
config.nav = [
    {
        // Title is the text shown for this nav item
        title: 'Home',
        // Url can be a relative path, or external URL
        url: '/'
    }
    // new items go here
];

// ## Environment
// **Warning:** Only change the settings below here if you are sure of what you are doing!
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

    // Default configuration
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

// Export config
module.exports = config;