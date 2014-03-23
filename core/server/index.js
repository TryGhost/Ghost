// Module dependencies
var crypto      = require('crypto'),
    express     = require('express'),
    hbs         = require('express-hbs'),
    fs          = require('fs'),
    uuid        = require('node-uuid'),
    Polyglot    = require('node-polyglot'),
    semver      = require('semver'),
    _           = require('lodash'),
    when        = require('when'),

    api         = require('./api'),
    config      = require('./config'),
    errors      = require('./errorHandling'),
    helpers     = require('./helpers'),
    mailer      = require('./mail'),
    middleware  = require('./middleware'),
    models      = require('./models'),
    permissions = require('./permissions'),
    apps        = require('./apps'),
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
        location = config().paths.builtScriptPath,

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

function startGhost(deferred) {

    return function () {
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
                config.getSocket() || config().server.host + ':' + config().server.port,
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

        deferred.resolve();
    };
}

// ## Initializes the ghost application.
// Sets up the express server instance.
// Instantiates the ghost singleton, helpers, routes, middleware, and apps.
// Finally it starts the http server.
function init(server) {
    // create a hash for cache busting assets
    var assetHash = (crypto.createHash('md5').update(packageInfo.version + Date.now()).digest('hex')).substring(0, 10);

    // If no express instance is passed in
    // then create our own
    if (!server) {
        server = express();
    }

    // Set up Polygot instance on the require module
    Polyglot.instance = new Polyglot();

    // ### Initialisation
    // The server and its dependencies require a populated config
    // It returns a promise that is resolved when the application
    // has finished starting up.

    // Make sure javascript files have been built via grunt concat
    return builtFilesExist().then(function () {
        // Initialise the models
        return models.init();
    }).then(function () {
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
            permissions.init(),
            // Initialize mail
            mailer.init(),
            // Initialize apps
            apps.init()
        );
    }).then(function () {
        var adminHbs = hbs.create(),
            deferred = when.defer();

        // ##Configuration

        // return the correct mime type for woff filess
        express['static'].mime.define({'application/font-woff': ['woff']});

        // ## View engine
        // set the view engine
        server.set('view engine', 'hbs');

        // Create a hbs instance for admin and init view engine
        server.set('admin view engine', adminHbs.express3({partialsDir: config().paths.adminViews + 'partials'}));

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

        // Log all theme errors and warnings
        _.each(config().paths.availableThemes._messages.errors, function (error) {
            errors.logError(error.message, error.context, error.help);
        });

        _.each(config().paths.availableThemes._messages.warns, function (warn) {
            errors.logWarn(warn.message, warn.context, warn.help);
        });

        // ## Start Ghost App
        if (config.getSocket()) {
            // Make sure the socket is gone before trying to create another
            fs.unlink(config.getSocket(), function (err) {
                /*jshint unused:false*/
                server.listen(
                    config.getSocket(),
                    startGhost(deferred)
                );
                fs.chmod(config.getSocket(), '0660');
            });

        } else {
            server.listen(
                config().server.port,
                config().server.host,
                startGhost(deferred)
            );
        }

        return deferred.promise;
    });
}

module.exports = init;
