const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const {hbs} = require('../handlebars');

// Register an async handlebars helper for a given handlebars instance
function asyncHelperWrapper(hbsInstance, name, fn) {
    hbsInstance.registerAsyncHelper(name, async function returnAsync(context, options, cb) {
        // Handle the case where we only get context and cb
        if (!cb) {
            cb = options;
            options = undefined;
        }

        try {
            const response = await fn.call(this, context, options);
            cb(response);
        } catch (error) {
            const wrappedErr = errors.utils.isGhostError(error) ? error : new errors.IncorrectUsageError({
                err: error,
                context: 'registerAsyncThemeHelper: ' + name,
                errorDetails: {
                    originalError: error
                }
            });

            const response = process.env.NODE_ENV === 'development' ? wrappedErr : '';

            logging.error(wrappedErr);

            cb(new hbsInstance.SafeString(response));
        }
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
