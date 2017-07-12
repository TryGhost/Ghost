var hbs             = require('express-hbs'),
    Promise         = require('bluebird'),
    errors          = require('../errors'),
    utils           = require('./utils'),
    i18n            = require('../i18n'),
    coreHelpers     = {},
    registerHelpers;

if (!utils.isProduction) {
    hbs.handlebars.logger.level = 0;
}

coreHelpers.asset  = require('./asset');
coreHelpers.author  = require('./author');
coreHelpers.body_class  = require('./body_class');
coreHelpers.content  = require('./content');
coreHelpers.img_url  = require('./img_url');
coreHelpers.date  = require('./date');
coreHelpers.encode  = require('./encode');
coreHelpers.excerpt  = require('./excerpt');
coreHelpers.facebook_url = require('./facebook_url');
coreHelpers.foreach = require('./foreach');
coreHelpers.get = require('./get');
coreHelpers.ghost_foot = require('./ghost_foot');
coreHelpers.ghost_head = require('./ghost_head');
coreHelpers.image = require('./image');
coreHelpers.is = require('./is');
coreHelpers.has = require('./has');
coreHelpers.meta_description = require('./meta_description');
coreHelpers.meta_title = require('./meta_title');
coreHelpers.navigation = require('./navigation');
coreHelpers.pagination = require('./pagination');
coreHelpers.plural = require('./plural');
coreHelpers.post_class = require('./post_class');
coreHelpers.prev_post = require('./prev_next');
coreHelpers.next_post = require('./prev_next');
coreHelpers.tags = require('./tags');
coreHelpers.title = require('./title');
coreHelpers.twitter_url = require('./twitter_url');
coreHelpers.url = require('./url');

// Specialist helpers for certain templates
coreHelpers.input_password = require('./input_password');
coreHelpers.input_email = require('./input_email');
coreHelpers.page_url = require('./page_url');
coreHelpers.pageUrl = require('./page_url').deprecated;

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError(i18n.t('warnings.helpers.index.missingHelper', {arg: arg}));
};

// Register an async handlebars helper for a given handlebars instance
function registerAsyncHelper(hbs, name, fn) {
    hbs.registerAsyncHelper(name, function (context, options, cb) {
        // Handle the case where we only get context and cb
        if (!cb) {
            cb = options;
            options = undefined;
        }

        // Wrap the function passed in with a when.resolve so it can return either a promise or a value
        Promise.resolve(fn.call(this, context, options)).then(function (result) {
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
    registerThemeHelper('body_class', coreHelpers.body_class);
    registerThemeHelper('content', coreHelpers.content);
    registerThemeHelper('img_url', coreHelpers.img_url);
    registerThemeHelper('date', coreHelpers.date);
    registerThemeHelper('encode', coreHelpers.encode);
    registerThemeHelper('excerpt', coreHelpers.excerpt);
    registerThemeHelper('foreach', coreHelpers.foreach);
    registerThemeHelper('has', coreHelpers.has);
    registerThemeHelper('is', coreHelpers.is);
    registerThemeHelper('image', coreHelpers.image);
    registerThemeHelper('input_email', coreHelpers.input_email);
    registerThemeHelper('input_password', coreHelpers.input_password);
    registerThemeHelper('meta_description', coreHelpers.meta_description);
    registerThemeHelper('meta_title', coreHelpers.meta_title);
    registerThemeHelper('navigation', coreHelpers.navigation);
    registerThemeHelper('page_url', coreHelpers.page_url);
    registerThemeHelper('pageUrl', coreHelpers.pageUrl);
    registerThemeHelper('pagination', coreHelpers.pagination);
    registerThemeHelper('plural', coreHelpers.plural);
    registerThemeHelper('post_class', coreHelpers.post_class);
    registerThemeHelper('tags', coreHelpers.tags);
    registerThemeHelper('title', coreHelpers.title);
    registerThemeHelper('twitter_url', coreHelpers.twitter_url);
    registerThemeHelper('facebook_url', coreHelpers.facebook_url);
    registerThemeHelper('url', coreHelpers.url);

    // Async theme helpers
    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);
    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);
    registerAsyncThemeHelper('next_post', coreHelpers.next_post);
    registerAsyncThemeHelper('prev_post', coreHelpers.prev_post);
    registerAsyncThemeHelper('get', coreHelpers.get);

    // Register admin helpers
    registerAdminHelper('asset', coreHelpers.asset);
    registerAdminHelper('input_password', coreHelpers.input_password);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
module.exports.registerThemeHelper = registerThemeHelper;
module.exports.registerAsyncThemeHelper = registerAsyncThemeHelper;
