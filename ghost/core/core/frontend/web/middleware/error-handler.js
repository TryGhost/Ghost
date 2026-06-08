const hbs = require('express-hbs');
const _ = require('lodash');
const path = require('path');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const sentry = require('../../../shared/sentry');

const config = require('../../../shared/config');
const renderer = require('../../services/rendering');

// @TODO: make this properly shared code
const {prepareError, prepareErrorCacheControl, prepareStack} = require('@tryghost/mw-error-handler');

const messages = {
    oopsErrorTemplateHasError: 'Oops, seems there is an error in the error template.',
    encounteredError: 'Encountered the error: ',
    whilstTryingToRender: 'whilst trying to render an error page for the error: ',
    notFound: 'File not found',
    unexpectedError: 'An unexpected error occurred'
};

const escapeExpression = hbs.Utils.escapeExpression;

/**
 * This is a bare minimum setup, which allows us to render the error page
 * It uses the {{asset}} helper, and nothing more
 */
const createHbsEngine = () => {
    const engine = hbs.create();
    engine.registerHelper('asset', require('../../helpers/asset'));

    return engine.express4();
};

const errorFallbackMessage = err => `<h1>${tpl(messages.oopsErrorTemplateHasError)}</h1>
     <p>${tpl(messages.encounteredError)}</p>
     <pre>${escapeExpression(err.message || err)}</pre>
     <br ><p>${tpl(messages.whilstTryingToRender)}</p>
     ${err.statusCode} <pre>${escapeExpression(err.message || err)}</pre>`;

// eslint-disable-next-line no-unused-vars
const themeErrorRenderer = function themeErrorRenderer(err, req, res, next) {
    // Return a plain text response for static files. We do this because:
    // 1. Customised 404 templates could reference the missing asset causing recursion
    // 2. Static files should return plain errors, not HTML pages
    // 3. The theme engine might not be initialized on first request after boot
    const hasExtension = Boolean(path.extname(req.path));
    const isStaticFile = (hasExtension || err.code === 'STATIC_FILE_NOT_FOUND');
    if (isStaticFile) {
        // Convert non-Ghost errors for static files into proper Ghost errors
        if (!errors.utils.isGhostError(err)) {
            // Convert Express static errors to Ghost errors based on status code
            if (err.statusCode === 404) {
                err = new errors.NotFoundError({
                    message: tpl(messages.notFound),
                    code: 'STATIC_FILE_NOT_FOUND',
                    property: err.path
                });
            } else if (err.statusCode === 400) {
                err = new errors.BadRequestError({err: err});
            } else if (err.statusCode === 403) {
                err = new errors.NoPermissionError({err: err});
            } else if (err.name === 'RangeNotSatisfiableError') {
                err = new errors.RangeNotSatisfiableError({err});
            } else if (err.statusCode) {
                err = new errors.InternalServerError({err: err});
            }
        } else if (err.statusCode === 404 && err.code !== 'STATIC_FILE_NOT_FOUND') {
            // Override the message for 404s that were already converted to NotFoundError
            // by prepareError middleware
            err.message = tpl(messages.notFound);
            err.code = 'STATIC_FILE_NOT_FOUND';
        }

        const message = err.message || tpl(messages.unexpectedError);
        const statusCode = err.statusCode || 500;

        // Send a simple plain text error response
        res.status(statusCode);
        res.type('text/plain');
        return res.send(message);
    }

    // Renderer begin
    // Format Data
    const data = {
        message: err.message,
        statusCode: err.statusCode,
        errorDetails: err.errorDetails || []
    };

    // Template
    // @TODO: very dirty !!!!!!
    renderer.templates.setTemplate(req, res);

    // It can be that something went wrong with the theme or otherwise loading handlebars
    // This ensures that no matter what res.render will work here
    // @TODO: split the error handler for assets, admin & theme to refactor this away
    if (_.isEmpty(req.app.engines)) {
        res._template = 'error';
        req.app.engine('hbs', createHbsEngine());
        req.app.set('view engine', 'hbs');
        req.app.set('views', config.get('paths').defaultViews);
    }

    // @TODO use renderer here?!
    // Render Call - featuring an error handler for what happens if rendering fails
    res.render(res._template, data, (_err, html) => {
        if (!_err) {
            return res.send(html);
        }

        // re-attach new error e.g. error template has syntax error or misusage
        req.err = _err;

        // And then try to explain things to the user...
        // Cheat and output the error using handlebars escapeExpression
        return res.status(500).send(errorFallbackMessage(_err));
    });
};

module.exports.handleThemeResponse = [
    // Make sure the error can be served
    prepareError,
    // Add cache-control header
    prepareErrorCacheControl(),
    // Handle the error in Sentry
    sentry.errorHandler,
    // Format the stack for the user
    prepareStack,
    // Render the error using theme template
    themeErrorRenderer
];
