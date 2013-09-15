var _ = require('underscore'),
    colors = require("colors"),
    errors;

/**
 * Basic error handling helpers
 */
errors = {
    throwError: function (err) {
        if (!err) {
            err = new Error("An error occurred");
        }

        if (_.isString(err)) {
            throw new Error(err);
        }

        throw err;
    },

    logError: function (err, context, help) {
        err = err.message || err || "Unknown";
        // TODO: Logging framework hookup
//        Eventually we'll have better logging which will know about envs
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging'
                || process.env.NODE_ENV === 'production') {

            console.log("\nERROR:".red, err.red, err.stack || "");

            if (context) {
                console.log(context);
            }

            if (help) {
                console.log(help.green);
            }
            // add a new line
            console.log("");
        }
    },

    logErrorAndExit: function (err, context, help) {
        this.logError(err, context, help);
        // Exit with 0 to prevent npm errors as we have our own
        process.exit(0);
    },

    logAndThrowError: function (err, context, help) {
        this.logError(err, context, help);

        this.throwError(err, context, help);
    },

    logErrorWithRedirect: function (msg, context, help, redirectTo, req, res) {
        var self = this;

        return function () {
            self.logError(msg, context, help);

            if (_.isFunction(res.redirect)) {
                res.redirect(redirectTo);
            }
        };
    }
};

// Ensure our 'this' context in the functions
_.bindAll(errors, "throwError", "logError", "logAndThrowError", "logErrorWithRedirect");

module.exports = errors;