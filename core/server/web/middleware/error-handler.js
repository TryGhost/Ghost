var _ = require('lodash'),
    hbs = require('express-hbs'),
    debug = require('ghost-ignition').debug('error-handler'),
    config = require('../../config'),
    common = require('../../lib/common'),
    helpers = require('../../services/routing/helpers'),
    escapeExpression = hbs.Utils.escapeExpression,
    _private = {},
    errorHandler = {};

/**
 * This is a bare minimum setup, which allows us to render the error page
 * It uses the {{asset}} helper, and nothing more
 */
_private.createHbsEngine = function createHbsEngine() {
    var engine = hbs.create();
    engine.registerHelper('asset', require('../../helpers/asset'));

    return engine.express4();
};

/**
 * Get an error ready to be shown the the user
 *
 * @TODO: support multiple errors within one single error, see https://github.com/TryGhost/Ghost/issues/7116#issuecomment-252231809
 */
_private.prepareError = function prepareError(err, req, res, next) {
    debug(err);

    if (_.isArray(err)) {
        err = err[0];
    }

    if (!common.errors.utils.isIgnitionError(err)) {
        // We need a special case for 404 errors
        // @TODO look at adding this to the GhostError class
        if (err.statusCode && err.statusCode === 404) {
            err = new common.errors.NotFoundError({
                err: err
            });
        } else {
            err = new common.errors.GhostError({
                err: err,
                message: err.message,
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

_private.JSONErrorRenderer = function JSONErrorRenderer(err, req, res, next) { // eslint-disable-line no-unused-vars
    // @TODO: jsonapi errors format (http://jsonapi.org/format/#error-objects)
    res.json({
        errors: [{
            message: err.message,
            context: err.context,
            errorType: err.errorType,
            errorDetails: err.errorDetails
        }]
    });
};

_private.ErrorFallbackMessage = function ErrorFallbackMessage(err) {
    return '<h1>' + common.i18n.t('errors.errors.oopsErrorTemplateHasError') + '</h1>' +
    '<p>' + common.i18n.t('errors.errors.encounteredError') + '</p>' +
    '<pre>' + escapeExpression(err.message || err) + '</pre>' +
    '<br ><p>' + common.i18n.t('errors.errors.whilstTryingToRender') + '</p>' +
    err.statusCode + ' ' + '<pre>' + escapeExpression(err.message || err) + '</pre>';
};

_private.ThemeErrorRenderer = function ThemeErrorRenderer(err, req, res, next) {
    // If the error code is explicitly set to STATIC_FILE_NOT_FOUND,
    // Skip trying to render an HTML error, and move on to the basic error renderer
    // We do this because customised 404 templates could reference the image that's missing
    // A better long term solution might be to do this based on extension
    if (err.code === 'STATIC_FILE_NOT_FOUND') {
        return next(err);
    }

    // Renderer begin
    // Format Data
    var data = {
        message: err.message,
        // @deprecated Remove in Ghost 3.0
        code: err.statusCode,
        statusCode: err.statusCode,
        errorDetails: err.errorDetails || []
    };

    // Template
    // @TODO: very dirty !!!!!!
    helpers.templates.setTemplate(req, res);

    // It can be that something went wrong with the theme or otherwise loading handlebars
    // This ensures that no matter what res.render will work here
    // @TODO: split the error handler for assets, admin & theme to refactor this away
    if (_.isEmpty(req.app.engines)) {
        res._template = 'error';
        req.app.engine('hbs', _private.createHbsEngine());
        req.app.set('view engine', 'hbs');
        req.app.set('views', config.get('paths').defaultViews);
    }

    // @TODO use renderer here?!
    // Render Call - featuring an error handler for what happens if rendering fails
    res.render(res._template, data, function renderResponse(err, html) {
        if (!err) {
            return res.send(html);
        }

        // re-attach new error e.g. error template has syntax error or misusage
        req.err = err;

        // And then try to explain things to the user...
        // Cheat and output the error using handlebars escapeExpression
        return res.status(500).send(_private.ErrorFallbackMessage(err));
    });
};

_private.HTMLErrorRenderer = function HTMLErrorRender(err, req, res, next) {  // eslint-disable-line no-unused-vars
    var data = {
        message: err.message,
        statusCode: err.statusCode,
        errorDetails: err.errorDetails || []
    };

    // e.g. if you serve the admin /ghost and Ghost returns a 503 because it generates the urls at the moment.
    // This ensures that no matter what res.render will work here
    // @TODO: put to prepare error function?
    if (_.isEmpty(req.app.engines)) {
        res._template = 'error';
        req.app.engine('hbs', _private.createHbsEngine());
        req.app.set('view engine', 'hbs');
        req.app.set('views', config.get('paths').defaultViews);
    }

    res.render('error', data, function renderResponse(err, html) {
        if (!err) {
            return res.send(html);
        }

        // re-attach new error e.g. error template has syntax error or misusage
        req.err = err;

        // And then try to explain things to the user...
        // Cheat and output the error using handlebars escapeExpression
        return res.status(500).send(_private.ErrorFallbackMessage(err));
    });
};

_private.BasicErrorRenderer = function BasicErrorRenderer(err, req, res, next) { // eslint-disable-line no-unused-vars
    return res.send(res.statusCode + ' ' + err.message);
};

errorHandler.resourceNotFound = function resourceNotFound(req, res, next) {
    // TODO, handle unknown resources & methods differently, so that we can also produce
    // 405 Method Not Allowed
    next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.resourceNotFound')}));
};

errorHandler.pageNotFound = function pageNotFound(req, res, next) {
    next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
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
    _private.HTMLErrorRenderer,
    // Fall back to basic if HTML is not explicitly accepted
    _private.BasicErrorRenderer
];

errorHandler.handleThemeResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Render the error using theme template
    _private.ThemeErrorRenderer,
    // Fall back to basic if HTML is not explicitly accepted
    _private.BasicErrorRenderer
];

module.exports = errorHandler;
