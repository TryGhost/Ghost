var hbs             = require('express-hbs'),
    Promise         = require('bluebird'),
    errors          = require('../errors'),
    utils           = require('./utils'),
    coreHelpers     = {},
    registerHelpers;

// Pre-load settings data:
// - activeTheme
// - permalinks

if (!utils.isProduction) {
    hbs.handlebars.logger.level = 0;
}

coreHelpers.asset  = require('./asset');
coreHelpers.author  = require('./author');
coreHelpers.body_class  = require('./body_class');
coreHelpers.content  = require('./content');
coreHelpers.date  = require('./date');
coreHelpers.encode  = require('./encode');
coreHelpers.excerpt  = require('./excerpt');
coreHelpers.foreach = require('./foreach');
coreHelpers.ghost_foot = require('./ghost_foot');
coreHelpers.ghost_head = require('./ghost_head');
coreHelpers.is = require('./is');
coreHelpers.has = require('./has');
coreHelpers.meta_description = require('./meta_description');
coreHelpers.meta_title = require('./meta_title');
coreHelpers.navigation = require('./navigation');
coreHelpers.page_url = require('./page_url');
coreHelpers.pageUrl = require('./page_url').deprecated;
coreHelpers.pagination = require('./pagination');
coreHelpers.plural = require('./plural');
coreHelpers.post_class = require('./post_class');
coreHelpers.tags = require('./tags');
coreHelpers.title = require('./title');
coreHelpers.url = require('./url');
coreHelpers.image = require('./image');

coreHelpers.ghost_script_tags = require('./ghost_script_tags');

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError('Missing helper: "' + arg + '"');
};

// Register an async handlebars helper for a given handlebars instance
function registerAsyncHelper(hbs, name, fn) {
    hbs.registerAsyncHelper(name, function (options, cb) {
        // Wrap the function passed in with a when.resolve so it can
        // return either a promise or a value
        Promise.resolve(fn.call(this, options)).then(function (result) {
            cb(result);
        }).catch(function (err) {
            errors.logAndThrowError(err, 'registerAsyncThemeHelper: ' + name);
        });
    });
}

// Register a handlebars helper for themes
function registerThemeHelper(name, fn) {
    hbs.registerHelper(name, fn);
}

// Register an async handlebars helper for themes
function registerAsyncThemeHelper(name, fn) {
    registerAsyncHelper(hbs, name, fn);
}

// Register a handlebars helper for admin
function registerAdminHelper(name, fn) {
    coreHelpers.adminHbs.registerHelper(name, fn);
}

registerHelpers = function (adminHbs) {
    // Expose hbs instance for admin
    coreHelpers.adminHbs = adminHbs;

    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);
    registerThemeHelper('author', coreHelpers.author);
    registerThemeHelper('content', coreHelpers.content);
    registerThemeHelper('title', coreHelpers.title);
    registerThemeHelper('date', coreHelpers.date);
    registerThemeHelper('encode', coreHelpers.encode);
    registerThemeHelper('excerpt', coreHelpers.excerpt);
    registerThemeHelper('foreach', coreHelpers.foreach);
    registerThemeHelper('is', coreHelpers.is);
    registerThemeHelper('has', coreHelpers.has);
    registerThemeHelper('navigation', coreHelpers.navigation);
    registerThemeHelper('page_url', coreHelpers.page_url);
    registerThemeHelper('pageUrl', coreHelpers.pageUrl);
    registerThemeHelper('pagination', coreHelpers.pagination);
    registerThemeHelper('tags', coreHelpers.tags);
    registerThemeHelper('plural', coreHelpers.plural);
    registerThemeHelper('url', coreHelpers.url);
    registerThemeHelper('image', coreHelpers.image);

    // Async theme helpers
    registerAsyncThemeHelper('body_class', coreHelpers.body_class);
    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);
    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);
    registerAsyncThemeHelper('meta_description', coreHelpers.meta_description);
    registerAsyncThemeHelper('meta_title', coreHelpers.meta_title);
    registerAsyncThemeHelper('post_class', coreHelpers.post_class);

    // Register admin helpers
    registerAdminHelper('ghost_script_tags', coreHelpers.ghost_script_tags);
    registerAdminHelper('asset', coreHelpers.asset);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
module.exports.registerThemeHelper = registerThemeHelper;
module.exports.registerAsyncThemeHelper = registerAsyncThemeHelper;
module.exports.scriptFiles = utils.scriptFiles;
