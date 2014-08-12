// Module dependencies
var crypto      = require('crypto'),
    express     = require('express'),
    hbs         = require('express-hbs'),
    compress    = require('compression'),
    fs          = require('fs'),
    uuid        = require('node-uuid'),
    Polyglot    = require('node-polyglot'),
    semver      = require('semver'),
    _           = require('lodash'),
    when        = require('when'),

    api         = require('./api'),
    config      = require('./config'),
    errors      = require('./errors'),
    helpers     = require('./helpers'),
    mailer      = require('./mail'),
    middleware  = require('./middleware'),
    migrations  = require('./data/migration'),
    models      = require('./models'),
    permissions = require('./permissions'),
    apps        = require('./apps'),
    packageInfo = require('../../package.json'),

// Variables
    httpServer,
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
        '<strong>' + config.url + '</strong>.',
        'See <a href="http://support.ghost.org/">http://support.ghost.org</a> for instructions.'
    ];

    return api.notifications.add({ notifications: [{
        type: 'info',
        message: firstRunMessage.join(' ')
    }] }, {context: {internal: true}});
}

function initDbHashAndFirstRun() {
    return api.settings.read({key: 'dbHash', context: {internal: true}}).then(function (response) {
        var hash = response.settings[0].value,
            initHash;

        dbHash = hash;

        if (dbHash === null) {
            initHash = uuid.v4();
            return api.settings.edit({settings: [{key: 'dbHash', value: initHash}]}, {context: {internal: true}})
                .then(function (response) {
                    dbHash = response.settings[0].value;
                    return dbHash;
                }).then(doFirstRun);
        }

        return dbHash;
    });
}

// Checks for the existence of the "built" javascript files from grunt concat.
// Returns a promise that will be resolved if all files exist or rejected if
// any are missing.
function builtFilesExist() {
    var deferreds = [],
        location = config.paths.builtScriptPath,

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

function ghostStartMessages() {
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
            config.url,
            "\nCtrl+C to shut down".grey
        );

        // ensure that Ghost exits correctly on Ctrl+C
        process.removeAllListeners('SIGINT').on('SIGINT', function () {
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
                config.getSocket() || config.server.host + ':' + config.server.port,
            "\nUrl configured as:",
            config.url,
            "\nCtrl+C to shut down".grey
        );
        // ensure that Ghost exits correctly on Ctrl+C
        process.removeAllListeners('SIGINT').on('SIGINT', function () {
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


// This is run after every initialization is done, right before starting server.
// Its main purpose is to move adding notifications here, so none of the submodules
// should need to include api, which previously resulted in circular dependencies.
// This is also a "one central repository" of adding startup notifications in case
// in the future apps will want to hook into here
function initNotifications() {
    if (mailer.state && mailer.state.usingSendmail) {
        api.notifications.add({ notifications: [{
            type: 'info',
            message: [
                "Ghost is attempting to use your server's <b>sendmail</b> to send e-mail.",
                "It is recommended that you explicitly configure an e-mail service,",
                "See <a href=\"http://support.ghost.org/mail\">http://support.ghost.org/mail</a> for instructions"
            ].join(' ')
        }] }, {context: {internal: true}});
    }
    if (mailer.state && mailer.state.emailDisabled) {
        api.notifications.add({ notifications: [{
            type: 'warn',
            message: [
                "Ghost is currently unable to send e-mail.",
                "See <a href=\"http://support.ghost.org/mail\">http://support.ghost.org/mail</a> for instructions"
            ].join(' ')
        }] }, {context: {internal: true}});
    }
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
        // Initialize migrations
        return migrations.init();
    }).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return api.init();
    }).then(function () {
        // Initialize the permissions actions and objects
        // NOTE: Must be done before the config.theme.update and initDbHashAndFirstRun calls
        return permissions.init();
    }).then(function () {
        // We must pass the api.settings object
        // into this method due to circular dependencies.
        return config.theme.update(api.settings, config.url);
    }).then(function () {
        return when.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
            // Initialize mail
            mailer.init(),
            // Initialize apps
            apps.init()
        );
    }).then(function () {
        var adminHbs = hbs.create(),
            deferred = when.defer();

        // Output necessary notifications on init
        initNotifications();
        // ##Configuration

        // return the correct mime type for woff filess
        express['static'].mime.define({'application/font-woff': ['woff']});

        // enabled gzip compression by default
        if (config.server.compress !== false) {
            server.use(compress());
        }

        // ## View engine
        // set the view engine
        server.set('view engine', 'hbs');

        // Create a hbs instance for admin and init view engine
        server.set('admin view engine', adminHbs.express3({}));

        // Load helpers
        helpers.loadCoreHelpers(adminHbs, assetHash);

        // ## Middleware and Routing
        middleware(server, dbHash);

        // Log all theme errors and warnings
        _.each(config.paths.availableThemes._messages.errors, function (error) {
            errors.logError(error.message, error.context, error.help);
        });

        _.each(config.paths.availableThemes._messages.warns, function (warn) {
            errors.logWarn(warn.message, warn.context, warn.help);
        });

        // ## Start Ghost App
        if (config.getSocket()) {
            // Make sure the socket is gone before trying to create another
            try {
                fs.unlinkSync(config.getSocket());
            } catch (e) {
                // We can ignore this.
            }

            httpServer = server.listen(
                config.getSocket()
            );
            fs.chmod(config.getSocket(), '0660');

        } else {
            httpServer = server.listen(
                config.server.port,
                config.server.host
            );
        }

        httpServer.on('listening', function () {
            ghostStartMessages();
            deferred.resolve(httpServer);
        });


        return deferred.promise;
    });
}

module.exports = init;
