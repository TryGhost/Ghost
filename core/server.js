// Module dependencies
var express     = require('express'),
    when        = require('when'),
    _           = require('underscore'),
    colors      = require('colors'),
    semver      = require('semver'),
    fs          = require('fs'),
    slashes     = require('connect-slashes'),
    errors      = require('./server/errorHandling'),
    api         = require('./server/api'),
    plugins     = require('./server/plugins'),
    path        = require('path'),
    hbs         = require('express-hbs'),
    Ghost       = require('./ghost'),
    helpers     = require('./server/helpers'),
    middleware  = require('./server/middleware'),
    storage     = require('./server/storage'),
    routes      = require('./server/routes'),
    packageInfo = require('../package.json'),

// Variables
    loading = when.defer(),
    server = express(),
    ghost = new Ghost();

// If we're in development mode, require "when/console/monitor"
// for help in seeing swallowed promise errors.
if (process.env.NODE_ENV === 'development') {
    require('when/monitor/console');
}

// ##Custom Middleware

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the theme and the admin
function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = packageInfo.version;
    res.locals.path = req.path;
    res.locals.csrfToken = req.csrfToken();

    if (res.isAdmin) {
        api.users.read({id: req.session.user}).then(function (currentUser) {
            _.extend(res.locals,  {
                currentUser: {
                    name: currentUser.name,
                    email: currentUser.email,
                    image: currentUser.image
                },
                messages: ghost.notifications
            });
            next();
        }).otherwise(function () {
            // Only show passive notifications
            _.extend(res.locals, {
                messages: _.reject(ghost.notifications, function (notification) {
                    return notification.status !== 'passive';
                })
            });
            next();
        });
    } else {
        next();
    }
}

// ### InitViews Middleware
// Initialise Theme or Admin Views
function initViews(req, res, next) {
    /*jslint unparam:true*/
    var hbsOptions;

    if (!res.isAdmin) {
        // self.globals is a hack til we have a better way of getting combined settings & config
        hbsOptions = {templateOptions: {data: {blog: ghost.blogGlobals()}}};

        if (ghost.themeDirectories[ghost.settings('activeTheme')].hasOwnProperty('partials')) {
            // Check that the theme has a partials directory before trying to use it
            hbsOptions.partialsDir = path.join(ghost.paths().activeTheme, 'partials');
        }

        server.engine('hbs', hbs.express3(hbsOptions));
        server.set('views', ghost.paths().activeTheme);
    } else {
        server.engine('hbs', hbs.express3({partialsDir: ghost.paths().adminViews + 'partials'}));
        server.set('views', ghost.paths().adminViews);
    }

    next();
}

// ### Activate Theme
// Helper for manageAdminAndTheme
function activateTheme() {
    var stackLocation = _.indexOf(server.stack, _.find(server.stack, function (stackItem) {
        return stackItem.route === '' && stackItem.handle.name === 'settingEnabled';
    }));

    // clear the view cache
    server.cache = {};
    server.disable(server.get('activeTheme'));
    server.set('activeTheme', ghost.settings('activeTheme'));
    server.enable(server.get('activeTheme'));
    if (stackLocation) {
        server.stack[stackLocation].handle = middleware.whenEnabled(server.get('activeTheme'), middleware.staticTheme(ghost));
    }

    // Update user error template
    errors.updateActiveTheme(ghost.settings('activeTheme'));
}

 // ### ManageAdminAndTheme Middleware
// Uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
function manageAdminAndTheme(req, res, next) {
    // TODO improve this regex
    res.isAdmin = /(^\/ghost\/)/.test(req.url);
    if (res.isAdmin) {
        server.enable('admin');
        server.disable(server.get('activeTheme'));
    } else {
        server.enable(server.get('activeTheme'));
        server.disable('admin');
    }

    // Check if the theme changed
    if (ghost.settings('activeTheme') !== server.get('activeTheme')) {
        // Change theme
        if (!ghost.themeDirectories.hasOwnProperty(ghost.settings('activeTheme'))) {
            if (!res.isAdmin) {
                // Throw an error if the theme is not available, but not on the admin UI
                errors.logAndThrowError('The currently active theme ' + ghost.settings('activeTheme') + ' is missing.');
            }
        } else {
            activateTheme();
        }
    }

    next();
}

// Expose the promise we will resolve after our pre-loading
ghost.loaded = loading.promise;

when(ghost.init()).then(function () {
    return helpers.loadCoreHelpers(ghost);
}).then(function () {

    // ##Configuration
    var oneYear = 31536000000;

    // Logging configuration
    if (server.get('env') !== 'development') {
        server.use(express.logger());
    } else {
        server.use(express.logger('dev'));
    }

    // Favicon
    server.use(express.favicon(__dirname + '/shared/favicon.ico'));

    // return the correct mime type for woff filess
    express['static'].mime.define({'application/font-woff': ['woff']});
    // Shared static config
    server.use('/shared', express['static'](path.join(__dirname, '/shared')));

    server.use('/content/images', storage.get_storage().serve());

    // Serve our built scripts; can't use /scripts here because themes already are
    server.use('/built/scripts', express['static'](path.join(__dirname, '/built/scripts'), {
        // Put a maxAge of one year on built scripts
        maxAge: oneYear
    }));

    // First determine whether we're serving admin or theme content
    server.use(manageAdminAndTheme);

    // Admin only config
    server.use('/ghost', middleware.whenEnabled('admin', express['static'](path.join(__dirname, '/client/assets'))));

    // Theme only config
    server.use(middleware.whenEnabled(server.get('activeTheme'), middleware.staticTheme(ghost)));

    // Add in all trailing slashes
    server.use(slashes());

    server.use(express.json());
    server.use(express.urlencoded());
    server.use('/ghost/upload/', express.multipart());
    server.use('/ghost/upload/', express.multipart({uploadDir: __dirname + '/content/images'}));
    server.use('/ghost/api/v0.1/db/', express.multipart());
    server.use(express.cookieParser(ghost.dbHash));
    server.use(express.cookieSession({ cookie : { maxAge: 12 * 60 * 60 * 1000 }}));


    //enable express csrf protection
    server.use(express.csrf());
    // local data
    server.use(ghostLocals);
    // So on every request we actually clean out reduntant passive notifications from the server side
    server.use(middleware.cleanNotifications);

     // set the view engine
    server.set('view engine', 'hbs');

     // Initialise the views
    server.use(initViews);

    // process the application routes
    server.use(server.router);

    // ### Error handling
    // 404 Handler
    server.use(errors.error404);

    // 500 Handler
    server.use(errors.error500);

    // ## Routing
    // Set up API routes
    routes.api(server);
    // Set up Admin routes
    routes.admin(server);
    // Set up Frontend routes
    routes.frontend(server);

    // Are we using sockets? Custom socket or the default?
    function getSocket() {
        if (ghost.config().server.hasOwnProperty('socket')) {
            return _.isString(ghost.config().server.socket) ? ghost.config().server.socket : path.join(__dirname, '../content/', process.env.NODE_ENV + '.socket');
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
                ghost.config().url,
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
                getSocket() || ghost.config().server.host + ':' + ghost.config().server.port,
                "\nUrl configured as:",
                ghost.config().url,
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

        // Let everyone know we have finished loading
        loading.resolve();
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
                ghost.config().server.port,
                ghost.config().server.host,
                startGhost
            );
        }

    });
}, function (err) {
    errors.logErrorAndExit(err);
});
