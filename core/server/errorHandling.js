/*jslint regexp: true */
var _ = require('underscore'),
    colors = require("colors"),
    fs = require('fs'),
    path = require('path'),
    errors,

    // Paths for views
    appRoot = path.resolve(__dirname, '../'),
    themePath = path.resolve(appRoot + '/content/themes'),
    adminTemplatePath = path.resolve(appRoot + '/server/views/'),
    defaultErrorTemplatePath = path.resolve(adminTemplatePath + '/user-error.hbs'),
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
        var stack = err ? err.stack : null;
        err = err.message || err || "Unknown";
        // TODO: Logging framework hookup
        // Eventually we'll have better logging which will know about envs
        if ((process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'staging' ||
            process.env.NODE_ENV === 'production')) {

            console.error("\nERROR:".red, err.red);

            if (context) {
                console.error(context);
            }

            if (help) {
                console.error(help.green);
            }

            // add a new line
            console.error("");

            if (stack) {
                console.error(stack, "\n");
            }
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

        function parseStack(stack) {
            if (typeof stack !== "string") {
                return stack;
            }

            // TODO: split out line numbers
            var stackRegex = /\s*at\s*(\w+)?\s*\(([^\)]+)\)\s*/i;

            return (
                stack
                    .split(/[\r\n]+/)
                    .slice(1)
                    .map(function (line) {
                        var parts = line.match(stackRegex);
                        if (!parts) {
                            return null;
                        }

                        return {
                            "function": parts[1],
                            "at": parts[2]
                        };
                    })
                    .filter(function (line) {
                        return !!line;
                    })
            );
        }

        // Render the error!
        function renderErrorInt(errorView) {
            var stack = null;

            if (process.env.NODE_ENV !== "production" && err.stack) {
                stack = parseStack(err.stack);
            }

            // TODO: Attach node-polyglot
            res.render((errorView || "error"), {
                message: err.message || err,
                code: code,
                stack: stack
            });
        }

        if (code >= 500) {
            this.logError(err, "ErrorPage", "Ghost caught a processing error in the middleware layer.");
        }

        // Are we admin? If so, don't worry about the user template
        if (res.isAdmin || userErrorTemplateExists === true) {
            return renderErrorInt();
        }

        // We're not admin and the template doesn't exist. Render the default.
        if (userErrorTemplateExists === false) {
            return renderErrorInt(defaultErrorTemplatePath);
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

            renderErrorInt(defaultErrorTemplatePath);
        });
    },

    render404Page: function (req, res, next) {
        var message = res.isAdmin ? "No Ghost Found" : "Page Not Found";
        this.renderErrorPage(404, message, req, res, next);
    },

    render500Page: function (err, req, res, next) {
        if (!err || !(err instanceof Error)) {
            next();
        }
        errors.renderErrorPage(500, err, req, res, next);
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
    "render404Page",
    "render500Page"
);

module.exports = errors;