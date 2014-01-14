// If no env is set, default to development
// This needs to be above all other require()
// modules to ensure config gets right setting.

// Module dependencies
var crypto      = require('crypto'),
    express     = require('express'),
    hbs         = require('express-hbs'),
    fs          = require('fs'),
    uuid        = require('node-uuid'),
    path        = require('path'),
    Polyglot    = require('node-polyglot'),
    semver      = require('semver'),
    _           = require('underscore'),
    when        = require('when'),

    api         = require('./api'),
    config      = require('./config'),
    errors      = require('./errorHandling'),
    helpers     = require('./helpers'),
    mailer      = require('./mail'),
    middleware  = require('./middleware'),
    models      = require('./models'),
    permissions = require('./permissions'),
    plugins     = require('./plugins'),
    routes      = require('./routes'),
    packageInfo = require('../../package.json'),


// Variables
    dbHash;

// If we're in development mode, require "when/console/monitor"
// for help in seeing swallowed promise errors, and log any
// stderr messages from bluebird promises.
if (process.env.NODE_ENV === 'development') {
    require('when/monitor/console');
}

function doFirstRun() {
    var firstRunMessage = [
        'Welcome to Ghost.',
        'You\'re running under the <strong>',
        process.env.NODE_ENV,
        '</strong>environment.',

        'Your URL is set to',
        '<strong>' + config().url + '</strong>.',
        'See <a href="http://docs.ghost.org/">http://docs.ghost.org</a> for instructions.'
    ];

    return api.notifications.add({
        type: 'info',
        message: firstRunMessage.join(' '),
        status: 'persistent',
        id: 'ghost-first-run'
    });
}

function initDbHashAndFirstRun() {
    return when(api.settings.read('dbHash')).then(function (hash) {
        // we already ran this, chill
        // Holds the dbhash (mainly used for cookie secret)
        dbHash = hash.value;

        if (dbHash === null) {
            var initHash = uuid.v4();
            return when(api.settings.edit('dbHash', initHash)).then(function (settings) {
                dbHash = settings.dbHash;
                return dbHash;
            }).then(doFirstRun);
        }
        return dbHash.value;
    });
}

// Checks for the existence of the "built" javascript files from grunt concat.
// Returns a promise that will be resolved if all files exist or rejected if 
// any are missing.
function builtFilesExist() {
    var deferreds = [],
        location = config.paths().builtScriptPath,

        fileNames = process.env.NODE_ENV === 'production' ?
                helpers.scriptFiles.production : helpers.scriptFiles.development;

    function checkExist(fileName) {
        var deferred = when.defer(),
            errorMessage = "Javascript files have not been built.",
            errorHelp = "\nPlease read the getting started instructions at:" +
                        "\nhttps://github.com/TryGhost/Ghost#getting-started-guide-for-developers";

        fs.exists(fileName, function (exists) {
            if (exists) {
                deferred.resolve(true);
            } else {
                var err = new Error(errorMessage);

                err.help = errorHelp;
                deferred.reject(err);
            }
        });

        return deferred.promise;
    }

    fileNames.forEach(function (fileName) {
        deferreds.push(checkExist(location + fileName));
    });

    return when.all(deferreds);
}

// Sets up the express server instance.
// Instantiates the ghost singleton,
// helpers, routes, middleware, and plugins.
// Finally it starts the http server.
function setup(server) {

    // create a hash for cache busting assets
    var assetHash = (crypto.createHash('md5').update(packageInfo.version + Date.now()).digest('hex')).substring(0, 10);

    // Set up Polygot instance on the require module
    Polyglot.instance = new Polyglot();

    // ### Initialisation

    // Initialise the models
    models.init().then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return api.init();
    }).then(function () {
        // We must pass the api.settings object
        // into this method due to circular dependencies.
        return config.theme.update(api.settings, config().url);
    }).then(function () {
        return when.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
            // Initialize the permissions actions and objects
            permissions.init()
        );
    }).then(function () {
        // Make sure javascript files have been built via grunt concat
        return builtFilesExist();
    }).then(function () {
        // Initialize mail
        return mailer.init();
    }).then(function () {
        var adminHbs = hbs.create();

        // ##Configuration
        server.set('version hash', assetHash);

        // return the correct mime type for woff filess
        express['static'].mime.define({'application/font-woff': ['woff']});

        // ## View engine
        // set the view engine
        server.set('view engine', 'hbs');

        // Create a hbs instance for admin and init view engine
        server.set('admin view engine', adminHbs.express3({partialsDir: config.paths().adminViews + 'partials'}));

        // Load helpers
        helpers.loadCoreHelpers(adminHbs, assetHash);

        // ## Middleware
        middleware(server, dbHash);

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
                return _.isString(config().server.socket) ? config().server.socket : path.join(config.path().contentPath, process.env.NODE_ENV + '.socket');
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
                    "\nPlease go to http://nodejs.org to get a supported version".green
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

        // Initialize plugins then start the server
        plugins.init().then(function () {

            // ## Start Ghost App
            if (getSocket()) {
                // Make sure the socket is gone before trying to create another
                fs.unlink(getSocket(), function (err) {
                    /*jslint unparam:true*/
                    server.listen(
                        getSocket(),
                        startGhost
                    );
                    fs.chmod(getSocket(), '0660');
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
        errors.logErrorAndExit(err, err.context, err.help);
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
