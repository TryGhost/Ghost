// # Ghost Configuration
// Setup your Ghost install for various environments
// Documentation can be found at http://support.ghost.org/config/

var path = require('path'),
    config;

config = {
    // ### Production
    // When running Ghost in the wild, use the production environment
    // Configure your URL and mail settings here
    production: {
        url: 'http://my-ghost-blog.com',
        mail: {},
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost.db')
            },
            debug: false
        },

        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: '2368'
        },
        routes: {
            rss: {path: '/rss', controller: 'rss'},
            pageRss: {path: '/rss/:page/', controller: 'rss'},
            authorRss: {path: '/author/:slug/rss/', controller: 'rss'},
            authorPageRss: {path: '/author/:slug/rss/:page/', controller: 'rss'},
            tagPage: {path: '/tag/:slug/page/:page/', controller: 'tag'},
            tagRss: {path: '/tag/:slug/rss/', controller: 'rss'},
            tagPageRss: {path: '/tag/:slug/rss/:page', controller: 'rss'},
            tag: {path: '/tag/:slug/', controller: 'tag'},
            authorPage: {path: '/author/:slug/page/:page/', controller: 'author'},
            author: {path: '/author/:slug/', controller: 'author'},
            page: {path: '/page/:page/', controller: 'homepage'},
            homepage: {path: '/', controller: 'homepage'},
            single: {path: '*', controller: 'single'}
        },
        aliases: [
            {reqPath: '/feed/', resPath: '/rss/', status: 301},
            {reqPath: '/feed/:page/', resPath: '/rss/:page/', status: 301},
            {reqPath: '/author/:slug/feed/', resPath: '/author/:slug/rss/', status: 301},
            {reqPath: '/author/:slug/feed/:page/', resPath: '/author/:slug/rss/:page/', status: 301}
        ]
    },

    // ### Development **(default)**
    development: {
        // The url to use when providing links to the site, E.g. in RSS and email.
        // Change this to your Ghost blogs published URL.
        url: 'http://localhost:2368',

        // Example mail config
        // Visit http://support.ghost.org/mail for instructions
        // ```
        //  mail: {
        //      transport: 'SMTP',
        //      options: {
        //          service: 'Mailgun',
        //          auth: {
        //              user: '', // mailgun username
        //              pass: ''  // mailgun password
        //          }
        //      }
        //  },
        // ```

        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-dev.db')
            },
            debug: false
        },
        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: '2368'
        },
        paths: {
            contentPath: path.join(__dirname, '/content/')
        },
        // Routes to map URL paths to controllers that handle requests
        routes: {
            rss: {path: '/rss', controller: 'rss'},
            pageRss: {path: '/rss/:page/', controller: 'rss'},
            authorRss: {path: '/author/:slug/rss/', controller: 'rss'},
            authorPageRss: {path: '/author/:slug/rss/:page/', controller: 'rss'},
            tagPage: {path: '/tag/:slug/page/:page/', controller: 'tag'},
            tagRss: {path: '/tag/:slug/rss/', controller: 'rss'},
            tagPageRss: {path: '/tag/:slug/rss/:page', controller: 'rss'},
            tag: {path: '/tag/:slug/', controller: 'tag'},
            authorPage: {path: '/author/:slug/page/:page/', controller: 'author'},
            author: {path: '/author/:slug/', controller: 'author'},
            page: {path: '/page/:page/', controller: 'homepage'},
            homepage: {path: '/', controller: 'homepage'},
            single: {path: '*', controller: 'single'}
        },
        // Aliases to redirect alternative paths
        aliases: [
            {reqPath: '/feed/', resPath: '/rss/', status: 301},
            {reqPath: '/feed/:page/', resPath: '/rss/:page/', status: 301},
            {reqPath: '/author/:slug/feed/', resPath: '/author/:slug/rss/', status: 301},
            {reqPath: '/author/:slug/feed/:page/', resPath: '/author/:slug/rss/:page/', status: 301}
        ]
    },

    // **Developers only need to edit below here**

    // ### Testing
    // Used when developing Ghost to run tests and check the health of Ghost
    // Uses a different port number
    testing: {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-test.db')
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false,
        routes: {
            rss: {path: '/rss', controller: 'rss'},
            pageRss: {path: '/rss/:page/', controller: 'rss'},
            authorRss: {path: '/author/:slug/rss/', controller: 'rss'},
            authorPageRss: {path: '/author/:slug/rss/:page/', controller: 'rss'},
            tagPage: {path: '/tag/:slug/page/:page/', controller: 'tag'},
            tagRss: {path: '/tag/:slug/rss/', controller: 'rss'},
            tagPageRss: {path: '/tag/:slug/rss/:page', controller: 'rss'},
            tag: {path: '/tag/:slug/', controller: 'tag'},
            authorPage: {path: '/author/:slug/page/:page/', controller: 'author'},
            author: {path: '/author/:slug/', controller: 'author'},
            page: {path: '/page/:page/', controller: 'homepage'},
            homepage: {path: '/', controller: 'homepage'},
            single: {path: '*', controller: 'single'}
        },
        aliases: [
            {reqPath: '/feed/', resPath: '/rss/', status: 301},
            {reqPath: '/feed/:page/', resPath: '/rss/:page/', status: 301},
            {reqPath: '/author/:slug/feed/', resPath: '/author/:slug/rss/', status: 301},
            {reqPath: '/author/:slug/feed/:page/', resPath: '/author/:slug/rss/:page/', status: 301}
        ]
    },

    // ### Testing MySQL
    // Used by Travis - Automated testing run through GitHub
    'testing-mysql': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'mysql',
            connection: {
                host     : '127.0.0.1',
                user     : 'root',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false,
        routes: {
            rss: {path: '/rss', controller: 'rss'},
            pageRss: {path: '/rss/:page/', controller: 'rss'},
            authorRss: {path: '/author/:slug/rss/', controller: 'rss'},
            authorPageRss: {path: '/author/:slug/rss/:page/', controller: 'rss'},
            tagPage: {path: '/tag/:slug/page/:page/', controller: 'tag'},
            tagRss: {path: '/tag/:slug/rss/', controller: 'rss'},
            tagPageRss: {path: '/tag/:slug/rss/:page', controller: 'rss'},
            tag: {path: '/tag/:slug/', controller: 'tag'},
            authorPage: {path: '/author/:slug/page/:page/', controller: 'author'},
            author: {path: '/author/:slug/', controller: 'author'},
            page: {path: '/page/:page/', controller: 'homepage'},
            homepage: {path: '/', controller: 'homepage'},
            single: {path: '*', controller: 'single'}
        },
        aliases: [
            {reqPath: '/feed/', resPath: '/rss/', status: 301},
            {reqPath: '/feed/:page/', resPath: '/rss/:page/', status: 301},
            {reqPath: '/author/:slug/feed/', resPath: '/author/:slug/rss/', status: 301},
            {reqPath: '/author/:slug/feed/:page/', resPath: '/author/:slug/rss/:page/', status: 301}
        ]
    },

    // ### Testing pg
    // Used by Travis - Automated testing run through GitHub
    'testing-pg': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'pg',
            connection: {
                host     : '127.0.0.1',
                user     : 'postgres',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false,
        routes: {
            rss: {path: '/rss', controller: 'rss'},
            pageRss: {path: '/rss/:page/', controller: 'rss'},
            authorRss: {path: '/author/:slug/rss/', controller: 'rss'},
            authorPageRss: {path: '/author/:slug/rss/:page/', controller: 'rss'},
            tagPage: {path: '/tag/:slug/page/:page/', controller: 'tag'},
            tagRss: {path: '/tag/:slug/rss/', controller: 'rss'},
            tagPageRss: {path: '/tag/:slug/rss/:page', controller: 'rss'},
            tag: {path: '/tag/:slug/', controller: 'tag'},
            authorPage: {path: '/author/:slug/page/:page/', controller: 'author'},
            author: {path: '/author/:slug/', controller: 'author'},
            page: {path: '/page/:page/', controller: 'homepage'},
            homepage: {path: '/', controller: 'homepage'},
            single: {path: '*', controller: 'single'}
        },
        aliases: [
            {reqPath: '/feed/', resPath: '/rss/', status: 301},
            {reqPath: '/feed/:page/', resPath: '/rss/:page/', status: 301},
            {reqPath: '/author/:slug/feed/', resPath: '/author/:slug/rss/', status: 301},
            {reqPath: '/author/:slug/feed/:page/', resPath: '/author/:slug/rss/:page/', status: 301}
        ]
    }
};

// Export config
module.exports = config;
