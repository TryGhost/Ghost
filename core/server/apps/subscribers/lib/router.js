const path = require('path'),
    _ = require('lodash'),
    express = require('express'),
    subscribeRouter = express.Router(),
    bodyParser = require('body-parser'),
    // Dirty requires
    common = require('../../../lib/common'),
    urlService = require('../../../services/url'),
    validator = require('../../../data/validation').validator,
    routing = require('../../../services/routing'),
    templateName = 'subscribe';

function _renderer(req, res) {
    res.routerOptions = {
        type: 'custom',
        templates: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', `${templateName}.hbs`)
    };

    // Renderer begin
    // Format data
    const data = req.body;

    // Render Call
    return routing.helpers.renderer(req, res, data);
}

/**
 * Takes care of sanitizing the email input.
 * XSS prevention.
 * For success cases, we don't have to worry, because then the input contained a valid email address.
 */
function errorHandler(error, req, res, next) {
    req.body.email = '';
    req.body.subscribed_url = santizeUrl(req.body.subscribed_url);
    req.body.subscribed_referrer = santizeUrl(req.body.subscribed_referrer);

    if (error.statusCode !== 404) {
        res.locals.error = error;
        return _renderer(req, res);
    }

    next(error);
}

function honeyPot(req, res, next) {
    if (!req.body.hasOwnProperty('confirm') || req.body.confirm !== '') {
        return next(new Error('Oops, something went wrong!'));
    }

    // we don't need this anymore
    delete req.body.confirm;
    next();
}

function santizeUrl(url) {
    return validator.isEmptyOrURL(url || '') ? url : '';
}

function handleSource(req, res, next) {
    req.body.subscribed_url = santizeUrl(req.body.location);
    req.body.subscribed_referrer = santizeUrl(req.body.referrer);

    delete req.body.location;
    delete req.body.referrer;

    const resource = urlService.getResource(urlService.utils.absoluteToRelative(req.body.subscribed_url, {withoutSubdirectory: true}));

    if (resource) {
        req.body.post_id = resource.data.id;
    }

    next();
}

function storeSubscriber(req, res, next) {
    req.body.status = 'subscribed';

    const api = require('../../../api')[res.locals.apiVersion];

    if (_.isEmpty(req.body.email)) {
        return next(new common.errors.ValidationError({message: 'Email cannot be blank.'}));
    } else if (!validator.isEmail(req.body.email)) {
        return next(new common.errors.ValidationError({message: 'Invalid email.'}));
    }

    return api.subscribers.add({subscribers: [req.body]}, {context: {external: true}})
        .then(() => {
            res.locals.success = true;
            next();
        })
        .catch(() => {
            // we do not expose any information
            res.locals.success = true;
            next();
        });
}

// subscribe frontend route
subscribeRouter
    .route('/')
    .get(
        _renderer
    )
    .post(
        bodyParser.urlencoded({extended: true}),
        honeyPot,
        handleSource,
        storeSubscriber,
        _renderer
    );

// configure an error handler just for subscribe problems
subscribeRouter.use(errorHandler);

module.exports = subscribeRouter;
module.exports.storeSubscriber = storeSubscriber;
