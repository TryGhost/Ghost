// # Ghost Configuration

var path = require('path'),
    config = {};

// ## Environment
// **Warning:** Only change the settings below here if you are sure of what you are doing!
config = {
    testing: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-test.db')
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        // The url to use when providing links to the site; like RSS and email.
        url: 'http://127.0.0.1:2369'
    },

    travis: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost-travis.db')
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2368'
        },
        // The url to use when providing links to the site; like RSS and email.
        url: 'http://127.0.0.1:2368'
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
        server: {
            host: '127.0.0.1',
            port: '2368'
        },
        // The url to use when providing links to the site; like RSS and email.
        url: 'http://127.0.0.1:2368',
        // Example mail config
        mail: {
            transport: 'sendgrid',
            host: 'smtp.sendgrid.net',
            options: {
                service: 'Sendgrid',
                auth: {
                    user: '', // Super secret username
                    pass: ''  // Super secret password
                }
            }
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
        server: {
            host: '127.0.0.1',
            port: '2368'
        },
        // The url to use when providing links to the site; like RSS and email.
        url: 'http://127.0.0.1:2368'
    },

    production: {
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/core/server/data/ghost.db')
            },
            debug: false
        },
        server: {
            host: '127.0.0.1',
            port: '2368'
        },
        // The url to use when providing links to the site; like RSS and email.
        url: 'http://127.0.0.1:2368'
    }
};

// Export config
module.exports = config;