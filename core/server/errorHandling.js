var _ = require('underscore'),
    colors = require("colors"),
    fs = require('fs'),
    path = require('path'),
    errors,

    // Paths for views
    appRoot = path.resolve(__dirname, '../'),
    themePath = path.resolve(appRoot + '/content/themes'),
    userErrorTemplatePath = path.resolve(themePath + '/error.hbs'),
    userErrorTemplateExists;

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
        // Eventually we'll have better logging which will know about envs
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
    },

    renderErrorPage: function (code, err, req, res, next) {
        // Render the error!
        function renderErrorInt() {
            // TODO: Attach node-polyglot
            res.render('error', {
                message: err.message || err,
                code: code
            });
        }

        if (code >= 500) {
            this.logError(err, "ErrorPage");
        }

        // Are we admin? If so, don't worry about the user template
        if (res.isAdmin) {
            return renderErrorInt();
        }

        if (userErrorTemplateExists === false) {
            return next();
        }

        if (userErrorTemplateExists === true) {
            return renderErrorInt();
        }

        // userErrorTemplateExists is undefined, which means we
        // haven't yet checked for it. Do so now!
        fs.stat(userErrorTemplatePath, function (err, stat) {
            userErrorTemplateExists = !err;
            if (userErrorTemplateExists) {
                return renderErrorInt();
            }

            // Message only displays the first time an error is triggered.
            errors.logError(
                "Theme error template not found",
                null,
                "Add an error.hbs template to the theme for customised errors."
            );

            next();
        });
    },

    render404Page: function (req, res, next) {
        var message = res.isAdmin ? "No Ghost Found" : "Resource Not Found";
        this.renderErrorPage(404, message, req, res, next);
    }
};

// Ensure our 'this' context in the functions
_.bindAll(
    errors,
    "throwError",
    "logError",
    "logAndThrowError",
    "logErrorWithRedirect",
    "renderErrorPage",
    "render404Page"
);

module.exports = errors;