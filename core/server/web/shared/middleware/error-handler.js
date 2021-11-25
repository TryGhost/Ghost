const hbs = require('express-hbs');
const _ = require('lodash');
const debug = require('@tryghost/debug')('error-handler');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const config = require('../../../../shared/config');
const helpers = require('../../../../frontend/services/routing/helpers');
const sentry = require('../../../../shared/sentry');

const messages = {
    oopsErrorTemplateHasError: 'Oops, seems there is an error in the error template.',
    encounteredError: 'Encountered the error: ',
    whilstTryingToRender: 'whilst trying to render an error page for the error: ',
    pageNotFound: 'Page not found',
    resourceNotFound: 'Resource not found',
    actions: {
        images: {
            upload: 'upload image'
        }
    },
    userMessages: {
        BookshelfRelationsError: 'Database error, cannot {action}.',
        InternalServerError: 'Internal server error, cannot {action}.',
        IncorrectUsageError: 'Incorrect usage error, cannot {action}.',
        NotFoundError: 'Resource not found error, cannot {action}.',
        BadRequestError: 'Request not understood error, cannot {action}.',
        UnauthorizedError: 'Authorisation error, cannot {action}.',
        NoPermissionError: 'Permission error, cannot {action}.',
        ValidationError: 'Validation error, cannot {action}.',
        UnsupportedMediaTypeError: 'Unsupported media error, cannot {action}.',
        TooManyRequestsError: 'Too many requests error, cannot {action}.',
        MaintenanceError: 'Server down for maintenance, cannot {action}.',
        MethodNotAllowedError: 'Method not allowed, cannot {action}.',
        RequestEntityTooLargeError: 'Request too large, cannot {action}.',
        TokenRevocationError: 'Token is not available, cannot {action}.',
        VersionMismatchError: 'Version mismatch error, cannot {action}.',
        DataExportError: 'Error exporting content.',
        DataImportError: 'Duplicated entry, cannot save {action}.',
        DatabaseVersionError: 'Database version compatibility error, cannot {action}.',
        EmailError: 'Error sending email!',
        ThemeValidationError: 'Theme validation error, cannot {action}.',
        HostLimitError: 'Host Limit error, cannot {action}.',
        DisabledFeatureError: 'Theme validation error, the {{{helperName}}} helper is not available. Cannot {action}.',
        UpdateCollisionError: 'Saving failed! Someone else is editing this post.'
    }
};

const escapeExpression = hbs.Utils.escapeExpression;
const _private = {};
const errorHandler = {};

/**
 * This is a bare minimum setup, which allows us to render the error page
 * It uses the {{asset}} helper, and nothing more
 */
_private.createHbsEngine = () => {
    const engine = hbs.create();
    engine.registerHelper('asset', require('../../../../frontend/helpers/asset'));

    return engine.express4();
};

_private.updateStack = (err) => {
    let stackbits = err.stack.split(/\n/g);

    // We build this up backwards, so we always insert at position 1

    if (process.env.NODE_ENV === 'production' || err.statusCode === 404) {
        // In production mode, remove the stack trace
        stackbits.splice(1, stackbits.length - 1);
    } else {
        // In dev mode, clearly mark the strack trace
        stackbits.splice(1, 0, `Stack Trace:`);
    }

    // Add in our custom cotext and help methods

    if (err.help) {
        stackbits.splice(1, 0, `${err.help}`);
    }

    if (err.context) {
        stackbits.splice(1, 0, `${err.context}`);
    }

    return stackbits.join('\n');
};

/**
 * Get an error ready to be shown the the user
 *
 * @TODO: support multiple errors within one single error, see https://github.com/TryGhost/Ghost/issues/7116#issuecomment-252231809
 */
_private.prepareError = (err, req, res, next) => {
    debug(err);

    if (Array.isArray(err)) {
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
                message: err.message,
                statusCode: err.statusCode
            });
        }
    }

    // used for express logging middleware see core/server/app.js
    req.err = err;

    // alternative for res.status();
    res.statusCode = err.statusCode;

    err.stack = _private.updateStack(err);

    // never cache errors
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });

    next(err);
};

_private.JSONErrorRenderer = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.json({
        errors: [{
            message: err.message,
            context: err.context,
            help: err.help,
            errorType: err.errorType,
            errorDetails: err.errorDetails,
            ghostErrorCode: err.ghostErrorCode
        }]
    });
};

_private.JSONErrorRendererV2 = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const userError = _private.prepareUserMessage(err, req);

    res.json({
        errors: [{
            message: userError.message || null,
            context: userError.context || null,
            type: err.errorType || null,
            details: err.errorDetails || null,
            property: err.property || null,
            help: err.help || null,
            code: err.code || null,
            id: err.id || null
        }]
    });
};

_private.prepareUserMessage = (err, res) => {
    const userError = {
        message: err.message,
        context: err.context
    };

    const docName = _.get(res, 'frameOptions.docName');
    const method = _.get(res, 'frameOptions.method');

    if (docName && method) {
        let action;

        const actionMap = {
            browse: 'list',
            read: 'read',
            add: 'save',
            edit: 'edit',
            destroy: 'delete'
        };

        if (_.get(messages.actions, [docName, method])) {
            action = tpl(messages.actions[docName][method]);
        } else if (Object.keys(actionMap).includes(method)) {
            let resource = docName;

            if (method !== 'browse') {
                resource = resource.replace(/s$/, '');
            }

            action = `${actionMap[method]} ${resource}`;
        }

        if (action) {
            if (err.context) {
                userError.context = `${err.message} ${err.context}`;
            } else {
                userError.context = err.message;
            }

            userError.message = tpl(messages.userMessages[err.name], {action: action});
        }
    }

    return userError;
};

_private.ErrorFallbackMessage = err => `<h1>${tpl(messages.oopsErrorTemplateHasError)}</h1>
     <p>${tpl(messages.encounteredError)}</p>
     <pre>${escapeExpression(err.message || err)}</pre>
     <br ><p>${tpl(messages.whilstTryingToRender)}</p>
     ${err.statusCode} <pre>${escapeExpression(err.message || err)}</pre>`;

_private.ThemeErrorRenderer = (err, req, res, next) => {
    // If the error code is explicitly set to STATIC_FILE_NOT_FOUND,
    // Skip trying to render an HTML error, and move on to the basic error renderer
    // We do this because customised 404 templates could reference the image that's missing
    // A better long term solution might be to do this based on extension
    if (err.code === 'STATIC_FILE_NOT_FOUND') {
        return next(err);
    }

    // Renderer begin
    // Format Data
    const data = {
        message: err.message,
        // @deprecated Remove in Ghost 5.0
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
    res.render(res._template, data, (_err, html) => {
        if (!_err) {
            return res.send(html);
        }

        // re-attach new error e.g. error template has syntax error or misusage
        req.err = _err;

        // And then try to explain things to the user...
        // Cheat and output the error using handlebars escapeExpression
        return res.status(500).send(_private.ErrorFallbackMessage(_err));
    });
};

/**
 *  Borrowed heavily from finalHandler
 */

const DOUBLE_SPACE_REGEXP = /\x20{2}/g;
const NEWLINE_REGEXP = /\n/g;

function createHtmlDocument(status, message) {
    let body = escapeExpression(message)
        .replace(NEWLINE_REGEXP, '<br>')
        .replace(DOUBLE_SPACE_REGEXP, ' &nbsp;');

    return `<!DOCTYPE html>\n
       <html lang="en">\n
       <head>\n
       <meta charset="utf-8">\n
       <title>${status} Error</title>\n
       </head>\n
       <body>\n
       <pre>${status} ${body}</pre>\n
       </body>\n
       </html>\n`;
}

_private.HTMLErrorRenderer = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    return res.send(createHtmlDocument(res.statusCode, err.stack));
};

_private.BasicErrorRenderer = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    return res.send(res.statusCode + ' ' + err.stack);
};

errorHandler.resourceNotFound = (req, res, next) => {
    // TODO, handle unknown resources & methods differently, so that we can also produce
    // 405 Method Not Allowed
    next(new errors.NotFoundError({message: tpl(messages.resourceNotFound)}));
};

errorHandler.pageNotFound = (req, res, next) => {
    next(new errors.NotFoundError({message: tpl(messages.pageNotFound)}));
};

errorHandler.handleJSONResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using JSON format
    _private.JSONErrorRenderer
];

errorHandler.handleJSONResponseV2 = [
    // Make sure the error can be served
    _private.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using JSON format
    _private.JSONErrorRendererV2
];

errorHandler.handleHTMLResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using HTML format
    _private.HTMLErrorRenderer,
    // Fall back to basic if HTML is not explicitly accepted
    _private.BasicErrorRenderer
];

errorHandler.handleThemeResponse = [
    // Make sure the error can be served
    _private.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using theme template
    _private.ThemeErrorRenderer,
    // Fall back to basic if HTML is not explicitly accepted
    _private.BasicErrorRenderer
];

module.exports = errorHandler;
