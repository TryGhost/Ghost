// If no env is set, default to development
// This needs to be above all other require()
// modules to ensure config gets right setting.

// Module dependencies
var config       = require('./server/config'),
    express      = require('express'),
    when         = require('when'),
    _            = require('underscore'),
    semver       = require('semver'),
    fs           = require('fs'),
    errors       = require('./server/errorHandling'),
    plugins      = require('./server/plugins'),
    path         = require('path'),
    Ghost        = require('./ghost'),
    helpers      = require('./server/helpers'),
    middleware   = require('./server/middleware'),
    routes       = require('./server/routes'),
    packageInfo  = require('../package.json'),

// Variables
    ghost = new Ghost(),
    setup,
    init;

// If we're in development mode, require "when/console/monitor"
// for help in seeing swallowed promise errors.
if (process.env.NODE_ENV === 'development') {
    require('when/monitor/console');
}

// Sets up the express server instance.
// Instantiates the ghost singleton,
// helpers, routes, middleware, and plugins.
// Finally it starts the http server.
function setup(server) {
    when(ghost.init()).then(function () {
        return helpers.loadCoreHelpers(ghost, config);
    }).then(function () {

        // ##Configuration
        // set the view engine
        server.set('view engine', 'hbs');

        // set the configured URL
        server.set('ghost root', ghost.blogGlobals().path);

        // return the correct mime type for woff filess
        express['static'].mime.define({'application/font-woff': ['woff']});

        // ## Middleware
        middleware(server);

        // ## Routing

        // Set up API routes
        routes.api(server);

        // Set up Admin routes
        routes.admin(server);

        // Set up Frontend routes
        routes.frontend(server);

        // Are we using sockets? Custom socket or the default?
        function getSocket() {
            if (config().server.hasOwnProperty('socket')) {
                return _.isString(config().server.socket) ? config().server.socket : path.join(__dirname, '../content/', process.env.NODE_ENV + '.socket');
            }
            return false;
        }

        function startGhost() {
            // Tell users if their node version is not supported, and exit
            if (!semver.satisfies(process.versions.node, packageInfo.engines.node)) {
                console.log(
                    "\nERROR: Unsupported version of Node".red,
                    "\nGhost needs Node version".red,
                    packageInfo.engines.node.yellow,
                    "you are using version".red,
                    process.versions.node.yellow,
                    "\nPlease go to http://nodejs.org to get the latest version".green
                );

                process.exit(0);
            }

            // Startup & Shutdown messages
            if (process.env.NODE_ENV === 'production') {
                console.log(
                    "Ghost is running...".green,
                    "\nYour blog is now available on",
                    config().url,
                    "\nCtrl+C to shut down".grey
                );

                // ensure that Ghost exits correctly on Ctrl+C
                process.on('SIGINT', function () {
                    console.log(
                        "\nGhost has shut down".red,
                        "\nYour blog is now offline"
                    );
                    process.exit(0);
                });
            } else {
                console.log(
                    ("Ghost is running in " + process.env.NODE_ENV + "...").green,
                    "\nListening on",
                    getSocket() || config().server.host + ':' + config().server.port,
                    "\nUrl configured as:",
                    config().url,
                    "\nCtrl+C to shut down".grey
                );
                // ensure that Ghost exits correctly on Ctrl+C
                process.on('SIGINT', function () {
                    console.log(
                        "\nGhost has shutdown".red,
                        "\nGhost was running for",
                        Math.round(process.uptime()),
                        "seconds"
                    );
                    process.exit(0);
                });
            }

        }

        // Expose the express server on the ghost instance.
        ghost.server = server;

        // Initialize plugins then start the server
        plugins.init(ghost).then(function () {

            // ## Start Ghost App
            if (getSocket()) {
                // Make sure the socket is gone before trying to create another
                fs.unlink(getSocket(), function (err) {
                    /*jslint unparam:true*/
                    server.listen(
                        getSocket(),
                        startGhost
                    );
                    fs.chmod(getSocket(), '0744');
                });

            } else {
                server.listen(
                    config().server.port,
                    config().server.host,
                    startGhost
                );
            }

        });
    }, function (err) {
        errors.logErrorAndExit(err);
    });
}

// Initializes the ghost application.
function init(app) {
    if (!app) {
        app = express();
    }

    // The server and its dependencies require a populated config
    setup(app);
}

module.exports = init;
