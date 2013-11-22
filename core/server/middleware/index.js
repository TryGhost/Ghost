var middleware = require('./middleware'),
    express     = require('express'),
    _           = require('underscore'),
    slashes     = require('connect-slashes'),
    errors      = require('../errorHandling'),
    api         = require('../api'),
    path        = require('path'),
    hbs         = require('express-hbs'),
    Ghost       = require('../../ghost'),
    storage     = require('../storage'),
    packageInfo = require('../../../package.json'),

    ghost = new Ghost();

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

        ghost.server.engine('hbs', hbs.express3(hbsOptions));
        ghost.server.set('views', ghost.paths().activeTheme);
    } else {
        ghost.server.engine('hbs', hbs.express3({partialsDir: ghost.paths().adminViews + 'partials'}));
        ghost.server.set('views', ghost.paths().adminViews);
    }

    next();
}

// ### Activate Theme
// Helper for manageAdminAndTheme
function activateTheme() {
    var stackLocation = _.indexOf(ghost.server.stack, _.find(ghost.server.stack, function (stackItem) {
        return stackItem.route === '' && stackItem.handle.name === 'settingEnabled';
    }));

    // clear the view cache
    ghost.server.cache = {};
    ghost.server.disable(ghost.server.get('activeTheme'));
    ghost.server.set('activeTheme', ghost.settings('activeTheme'));
    ghost.server.enable(ghost.server.get('activeTheme'));
    if (stackLocation) {
        ghost.server.stack[stackLocation].handle = middleware.whenEnabled(ghost.server.get('activeTheme'), middleware.staticTheme(ghost));
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
        ghost.server.enable('admin');
        ghost.server.disable(ghost.server.get('activeTheme'));
    } else {
        ghost.server.enable(ghost.server.get('activeTheme'));
        ghost.server.disable('admin');
    }

    // Check if the theme changed
    if (ghost.settings('activeTheme') !== ghost.server.get('activeTheme')) {
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

module.exports = function (server) {
    var oneYear = 31536000000,
        corePath = path.join(ghost.paths().appRoot, 'core');

    // Logging configuration
    if (server.get('env') !== 'development') {
        server.use(express.logger());
    } else {
        server.use(express.logger('dev'));
    }

    // Favicon
    server.use(express.favicon(corePath + '/shared/favicon.ico'));

    // Shared static config
    server.use('/shared', express['static'](path.join(corePath, '/shared')));

    server.use('/content/images', storage.get_storage().serve());

    // Serve our built scripts; can't use /scripts here because themes already are
    server.use('/built/scripts', express['static'](path.join(corePath, '/built/scripts'), {
        // Put a maxAge of one year on built scripts
        maxAge: oneYear
    }));

    // First determine whether we're serving admin or theme content
    server.use(manageAdminAndTheme);

    // Admin only config
    server.use('/ghost', middleware.whenEnabled('admin', express['static'](path.join(corePath, '/client/assets'))));

    // Theme only config
    server.use(middleware.whenEnabled(server.get('activeTheme'), middleware.staticTheme(ghost)));

    // Add in all trailing slashes
    server.use(slashes());

    server.use(express.json());
    server.use(express.urlencoded());
    server.use('/ghost/upload/', express.multipart());
    server.use('/ghost/upload/', express.multipart({uploadDir: corePath + '/content/images'}));
    server.use('/ghost/api/v0.1/db/', express.multipart());
    server.use(express.cookieParser(ghost.dbHash));
    server.use(express.cookieSession({ cookie : { maxAge: 12 * 60 * 60 * 1000 }}));

    //enable express csrf protection
    server.use(express.csrf());
    // local data
    server.use(ghostLocals);
    // So on every request we actually clean out reduntant passive notifications from the server side
    server.use(middleware.cleanNotifications);

     // Initialise the views
    server.use(initViews);

    // process the application routes
    server.use(server.router);

    // ### Error handling
    // 404 Handler
    server.use(errors.error404);

    // 500 Handler
    server.use(errors.error500);
};

// Export middleware functions directly
module.exports.middleware = middleware;