var _ = require('lodash'),
    path = require('path'),
    hbs = require('express-hbs'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    _private = {},
    errorHandler = {},
    htmlStackExclusions = ['NotFoundError', 'DatabaseNotPopulatedError'];

_private.parseStack = function parseStack(stack) {
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

/**
 * Get an error ready to be shown the the user
 *
 * @TODO: support multiple errors
 * @TODO: decouple req.err
 */
_private.prepareError = function prepareError(err, req, res) {
    /*jshint unused:false */
    if (_.isArray(err)) {
        err = err[0];
    }

    if (!(err instanceof errors.GhostError)) {
        // We need a special case for 404 errors
        if (err.statusCode && err.statusCode === 404) {
            err = new errors.NotFoundError({
                err: err
            });
        } else {
            err = new errors.GhostError({
                err: err,
                statusCode: err.statusCode
            });
        }
    }

    req.err = err;
    res.statusCode = err.statusCode;

    // never cache errors
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });

    return err;
};

errorHandler.resourceNotFound = function resourceNotFound(req, res, next) {
    // TODO, handle unknown resources & methods differently, so that we can also produce
    // 405 Method Not Allowed
    next(new errors.NotFoundError({message: i18n.t('errors.errors.resourceNotFound')}));
};

errorHandler.pageNotFound = function pageNotFound(req, res, next) {
    next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
};

errorHandler.handleJSONResponse = function _handleJSONResponse(err, req, res, next) {
    /*jshint unused:false */
    // Make sure the error can be served
    err = _private.prepareError(err, req, res);

    // @TODO: jsonapi errors format ?
    res.json({
        errors: [{
            message: err.message,
            errorType: err.errorType,
            errorDetails: err.errorDetails
        }]
    });
};

errorHandler.handleHTMLResponse = function handleHTMLResponse(err, req, res, next) {
    /*jshint unused:false */
    // Make sure the error can be served
    err = _private.prepareError(err, req, res);

    // @TODO reconsider this
    var availableTheme = config.get('paths').availableThemes[req.app.get('activeTheme')] || {},
        defaultTemplate = availableTheme['error.hbs'] ||
            path.resolve(config.get('paths').adminViews, 'user-error.hbs') ||
            'error',
        templateData = {
            message: err.message,
            code: err.statusCode
        };

    if (!_.includes(htmlStackExclusions, err.errorType)) {
        templateData.stack = _private.parseStack(err.stack);
    }

    res.render(defaultTemplate, templateData, function renderResponse(err, html) {
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

module.exports = errorHandler;
