var _ = require('lodash'),
    path = require('path'),
    hbs = require('express-hbs'),
    config = require('../config'),
    i18n = require('../i18n'),
    _private = {};

_private.parseStack = function (stack) {
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
                    function: parts[1],
                    at: parts[2]
                };
            })
            .filter(function (line) {
                return !!line;
            })
    );
};

_private.handleHTMLResponse = function handleHTMLResponse(err, req, res) {
    return function handleHTMLResponse() {
        var availableTheme = config.get('paths').availableThemes[req.app.get('activeTheme')] || {},
            defaultTemplate = availableTheme['error.hbs'] ||
                path.resolve(config.get('paths').adminViews, 'user-error.hbs') ||
                'error';

        res.render(defaultTemplate, {
            message: err.message,
            code: err.statusCode,
            stack: _private.parseStack(err.stack)
        }, function renderResponse(err, html) {
            if (!err) {
                return res.send(html);
            }

            // And then try to explain things to the user...
            // Cheat and output the error using handlebars escapeExpression
            return res.status(500).send(
                '<h1>' + i18n.t('errors.errors.oopsErrorTemplateHasError') + '</h1>' +
                '<p>' + i18n.t('errors.errors.encounteredError') + '</p>' +
                '<pre>' + hbs.handlebars.Utils.escapeExpression(err.message || err) + '</pre>' +
                '<br ><p>' + i18n.t('errors.errors.whilstTryingToRender') + '</p>' +
                err.statusCode + ' ' + '<pre>' + hbs.handlebars.Utils.escapeExpression(err.message || err) + '</pre>'
            );
        });
    };
};

/**
 * @TODO: jsonapi errors format
 */
_private.handleJSONResponse = function handleJSONResponse(err, req, res) {
    return function handleJSONResponse() {
        res.json({
            errors: [{
                message: err.message,
                errorType: err.errorType
            }]
        });
    };
};

/**
 * @TODO: test uncaught exception (wrap into custom error!)
 * @TODO: support multiple errors
 * @TODO: decouple req.err
 */
module.exports = function errorHandler(err, req, res, next) {
    if (_.isArray(err)) {
        err = err[0];
    }

    req.err = err;
    res.statusCode = err.statusCode;

    // never cache errors
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });

    // @TODO: does this resolves all use cases?
    if (!req.headers.accept && !req.headers.hasOwnProperty('content-type')) {
        req.headers.accept = 'text/html';
    }

    // jscs:disable
    res.format({
        json: _private.handleJSONResponse(err, req, res, next),
        html: _private.handleHTMLResponse(err, req, res, next),
        'default': _private.handleHTMLResponse(err, req, res, next)
    });
};
