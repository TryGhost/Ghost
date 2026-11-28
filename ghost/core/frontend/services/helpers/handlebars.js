const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const { hbs } = require('../handlebars');

// Register a promise helper; errors are logged and rendered as '' (the error in development) so they don't fail the page
function asyncHelperWrapper(hbsInstance, name, fn) {
  hbsInstance.registerPromiseHelper(name, async function returnAsync(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      const wrappedErr = errors.utils.isGhostError(error)
        ? error
        : new errors.IncorrectUsageError({
            err: error,
            context: 'registerAsyncThemeHelper: ' + name,
            errorDetails: {
              originalError: error,
            },
          });

      const response = process.env.NODE_ENV === 'development' ? wrappedErr : '';

      logging.error(wrappedErr);

      return new hbsInstance.SafeString(response);
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
