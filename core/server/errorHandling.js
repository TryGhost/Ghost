var _ = require('underscore'),
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

    logError: function (err) {
        err = err || "Unknown";
        // TODO: Logging framework hookup
//        Eventually we'll have better logging which will know about envs
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging'
                || process.env.NODE_ENV === 'production') {
            console.log("Error occurred: ", err.message || err, err.stack || "");
        }
    },

    logAndThrowError: function (err) {
        this.logError(err);

        this.throwError(err);
    },

    logErrorWithMessage: function (msg) {
        var self = this;

        return function () {
            self.logError(msg);
        };
    },

    logErrorWithRedirect: function (msg, redirectTo, req, res) {
        var self = this;

        return function () {
            self.logError(msg);

            if (_.isFunction(res.redirect)) {
                res.redirect(redirectTo);
            }
        };
    }
};

// Ensure our 'this' context in the functions
_.bindAll(errors, "throwError", "logError", "logAndThrowError", "logErrorWithMessage", "logErrorWithRedirect");

module.exports = errors;