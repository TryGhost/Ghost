var _ = require('lodash'),
    hbs = require('express-hbs'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    templates = require('../controllers/frontend/templates'),
    escapeExpression = hbs.Utils.escapeExpression,
    _private = {},
    errorHandler = {};

_private.createHbsEngine = function createHbsEngine() {
    var engine = hbs.create();
    // @TODO get rid of this after #8126
    engine.registerHelper('asset', require('../helpers/asset'));

    return engine.express4();
};

/**
 * This function splits the stack into pieces, that are then rendered using the following handlebars code:
 * ```
 * {{#each stack}}
 *   <li>
 *   at
 *   {{#if function}}<em class="error-stack-function">{{function}}</em>{{/if}}
 *   <span class="error-stack-file">({{at}})</span>
 *   </li>
 * {{/each}}
 * ```
 * @TODO revisit whether this is useful as part of #7491
 */
_private.parseStack = function parseStack(stack) {
    if (!_.isString(stack)) {
        return stack;
    }

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
 * @TODO: support multiple errors within one single error, see https://github.com/TryGhost/Ghost/issues/7116#issuecomment-252231809
 */
_private.prepareError = function prepareError(err, req, res, next) {
    if (_.isArray(err)) {
        err = err[0];
    }

    if (!errors.utils.isIgnitionError(err)) {
        // We need a special case for 404 errors
        // @TODO look at adding this to the GhostError class
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

    // used for express logging middleware see core/server/app.js
    req.err = err;

    // alternative for res.status();
    res.statusCode = err.statusCode;

    // never cache errors
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });

    next(err);
};

_private.JSONErrorRenderer = function JSONErrorRenderer(err, req, res, /*jshint unused:false */ next) {
    // @TODO: jsonapi errors format (http://jsonapi.org/format/#error-objects)
    res.json({
        errors: [{
            message: err.message,
            errorType: err.errorType,
            errorDetails: err.errorDetails
        }]
    });
};

_private.HTMLErrorRenderer = function HTMLErrorRender(err, req, res, /*jshint unused:false */ next) {
    var templateData = {
            message: err.message,
            code: err.statusCode
        };

    if (err.statusCode === 500 && config.get('printErrorStack')) {
        templateData.stack = err.stack;
    }

    // It can be that something went wrong with the theme or otherwise loading handlebars
    // This ensures that no matter what res.render will work here
    if (_.isEmpty(req.app.engines)) {
        req.app.engine('hbs', _private.createHbsEngine());
    }

    res.render(templates.error(err.statusCode), templateData, function renderResponse(err, html) {
        if (!err) {
            return res.send(html);
        }

        // And then try to explain things to the user...
        // Cheat and output the error using handlebars escapeExpression
        return res.status(500).send(
            '<h1>' + i18n.t('errors.errors.oopsErrorTemplateHasError') + '</h1>' +
            '<p>' + i18n.t('errors.errors.encounteredError') + '</p>' +
            '<pre>' + escapeExpression(err.message || err) + '</pre>' +
            '<br ><p>' + i18n.t('errors.errors.whilstTryingToRender') + '</p>' +
            err.statusCode + ' ' + '<pre>' + escapeExpression(err.message || err) + '</pre>'
        );
    });
};

errorHandler.resourceNotFound = function resourceNotFound(req, res, next) {
    // TODO, handle unknown resources & methods differently, so that we can also produce
    // 405 Method Not Allowed
    next(new errors.NotFoundError({message: i18n.t('errors.errors.resourceNotFound')}));
};

errorHandler.pageNotFound = function pageNotFound(req, res, next) {
    next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
};

errorHandler.handleJSONResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Render the error using JSON format
    _private.JSONErrorRenderer
];

errorHandler.handleHTMLResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Render the error using HTML format
    _private.HTMLErrorRenderer
];

module.exports = errorHandler;
