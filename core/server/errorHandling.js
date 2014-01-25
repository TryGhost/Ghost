/*jslint regexp: true */
var _           = require('underscore'),
    colors      = require('colors'),
    fs          = require('fs'),
    configPaths = require('./config/paths'),
    path        = require('path'),
    when        = require('when'),
    hbs         = require('express-hbs'),
    errors,

    // Paths for views
    defaultErrorTemplatePath = path.resolve(configPaths().adminViews, 'user-error.hbs'),
    userErrorTemplatePath    = path.resolve(configPaths().themePath, 'error.hbs'),
    userErrorTemplateExists   = false,

    ONE_HOUR_S  = 60 * 60;

/**
 * Basic error handling helpers
 */
errors = {
    updateActiveTheme: function (activeTheme, hasErrorTemplate) {
        userErrorTemplatePath = path.resolve(configPaths().themePath, activeTheme, 'error.hbs');
        userErrorTemplateExists = hasErrorTemplate;
    },

    throwError: function (err) {
        if (!err) {
            err = new Error("An error occurred");
        }

        if (_.isString(err)) {
            throw new Error(err);
        }

        throw err;
    },

    // ## Reject Error
    // Used to pass through promise errors when we want to handle them at a later time
    rejectError: function (err) {
        return when.reject(err);
    },

    logWarn: function (warn, context, help) {
        if ((process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'staging' ||
            process.env.NODE_ENV === 'production')) {

            console.log('\nWarning:'.yellow, warn.yellow);

            if (context) {
                console.log(context.white);
            }

            if (help) {
                console.log(help.green);
            }

            // add a new line
            console.log('');
        }
    },

    logError: function (err, context, help) {
        var stack = err ? err.stack : null;
        if (err) {
            err = err.message || err || 'An unknown error occurred.';
        } else {
            err = 'An unknown error occurred.';
        }
        // TODO: Logging framework hookup
        // Eventually we'll have better logging which will know about envs
        if ((process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'staging' ||
            process.env.NODE_ENV === 'production')) {

            console.error('\nERROR:'.red, err.red);

            if (context) {
                console.error(context.white);
            }

            if (help) {
                console.error(help.green);
            }

            // add a new line
            console.error('');

            if (stack) {
                console.error(stack, '\n');
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
        /*jslint unparam:true*/
        var self = this;

        return function () {
            self.logError(msg, context, help);

            if (_.isFunction(res.redirect)) {
                res.redirect(redirectTo);
            }
        };
    },

    renderErrorPage: function (code, err, req, res, next) {
        /*jslint unparam:true*/

        var self = this;

        function parseStack(stack) {
            if (!_.isString(stack)) {
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
                            'function': parts[1],
                            'at': parts[2]
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

            if (process.env.NODE_ENV !== 'production' && err.stack) {
                stack = parseStack(err.stack);
            }

            res.status(code).render((errorView || 'error'), {
                message: err.message || err,
                code: code,
                stack: stack
            }, function (templateErr, html) {
                if (!templateErr) {
                    return res.send(code, html);
                }
                // There was an error trying to render the error page, output the error
                self.logError(templateErr, 'Error whilst rendering error page', 'Error template has an error');

                // And then try to explain things to the user...
                // Cheat and output the error using handlebars escapeExpression
                return res.send(500, "<h1>Oops, seems there is an an error in the error template.</h1>"
                    + "<p>Encountered the error: </p>"
                    + "<pre>" + hbs.handlebars.Utils.escapeExpression(templateErr.message || templateErr) + "</pre>"
                    + "<br ><p>whilst trying to render an error page for the error: </p>"
                    + code + " " + "<pre>"  + hbs.handlebars.Utils.escapeExpression(err.message || err) + "</pre>"
                    );
            });
        }

        if (code >= 500) {
            this.logError(err, "Rendering Error Page", "Ghost caught a processing error in the middleware layer.");
        }

        // Are we admin? If so, don't worry about the user template
        if ((res.isAdmin && req.session.user) || userErrorTemplateExists === true) {
            return renderErrorInt();
        }

        // We're not admin and the template doesn't exist. Render the default.
        return renderErrorInt(defaultErrorTemplatePath);
    },

    error404: function (req, res, next) {
        var message = res.isAdmin && req.session.user ? "No Ghost Found" : "Page Not Found";

        // 404 errors should be briefly cached
        res.set({'Cache-Control': 'public, max-age=' + ONE_HOUR_S});
        if (req.method === 'GET') {
            this.renderErrorPage(404, message, req, res, next);
        } else {
            res.send(404, message);
        }
    },

    error500: function (err, req, res, next) {
        // 500 errors should never be cached
        res.set({'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});

        if (err.status === 404) {
            return this.error404(req, res, next);
        }

        if (req.method === 'GET') {
            if (!err || !(err instanceof Error)) {
                next();
            }
            errors.renderErrorPage(err.status || 500, err, req, res, next);
        } else {
            res.send(err.status || 500, err);
        }
    }
};

// Ensure our 'this' context in the functions
_.bindAll(
    errors,
    'throwError',
    'logError',
    'logAndThrowError',
    'logErrorWithRedirect',
    'renderErrorPage',
    'error404',
    'error500'
);

module.exports = errors;
