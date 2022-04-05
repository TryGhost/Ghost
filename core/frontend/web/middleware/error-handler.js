const hbs = require('express-hbs');
const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const sentry = require('../../../shared/sentry');

const config = require('../../../shared/config');
const renderer = require('../../services/rendering');

// @TODO: make this properly shared code
const {prepareError, prepareStack} = require('@tryghost/mw-error-handler');

const messages = {
    oopsErrorTemplateHasError: 'Oops, seems there is an error in the error template.',
    encounteredError: 'Encountered the error: ',
    whilstTryingToRender: 'whilst trying to render an error page for the error: '
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

const themeErrorRenderer = (err, req, res, next) => {
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
    // Handle the error in Sentry
    sentry.errorHandler,
    // Format the stack for the user
    prepareStack,
    // Render the error using theme template
    themeErrorRenderer
];
