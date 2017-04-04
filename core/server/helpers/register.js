var hbs = require('../themes/engine'),
    Promise = require('bluebird'),
    errors = require('../errors');

// Register an async handlebars helper for a given handlebars instance
function asyncHelperWrapper(hbs, name, fn) {
    hbs.registerAsyncHelper(name, function returnAsync(context, options, cb) {
        // Handle the case where we only get context and cb
        if (!cb) {
            cb = options;
            options = undefined;
        }

        // Wrap the function passed in with a when.resolve so it can return either a promise or a value
        Promise.resolve(fn.call(this, context, options)).then(function (result) {
            cb(result);
        }).catch(function (err) {
            throw new errors.IncorrectUsageError({
                err: err,
                context: 'registerAsyncThemeHelper: ' + name
            });
        });
    });
}

// Register a handlebars helper for themes
module.exports.registerThemeHelper = function registerThemeHelper(name, fn) {
    hbs.registerHelper(name, fn);
};

// Register an async handlebars helper for themes
module.exports.registerAsyncThemeHelper = function registerAsyncThemeHelper(name, fn) {
    asyncHelperWrapper(hbs, name, fn);
};
