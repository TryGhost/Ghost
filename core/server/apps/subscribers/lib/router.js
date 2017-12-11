var path = require('path'),
    express = require('express'),
    _ = require('lodash'),
    subscribeRouter = express.Router(),
    bodyParser = require('body-parser'),

    // Dirty requires
    api = require('../../../api'),
    common = require('../../../lib/common'),
    validator = require('../../../data/validation').validator,
    postLookup = require('../../../controllers/frontend/post-lookup'),
    renderer = require('../../../controllers/frontend/renderer'),

    templateName = 'subscribe';

function _renderer(req, res) {
    // Note: this is super similar to the config middleware used in channels
    // @TODO refactor into to something explicit & DRY this up
    res._route = {
        type: 'custom',
        templateName: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', templateName + '.hbs')
    };

    // Renderer begin
    // Format data
    var data = req.body;

    // Render Call
    return renderer(req, res, data);
}

/**
 * Takes care of sanitizing the email input.
 * XSS prevention.
 * For success cases, we don't have to worry, because then the input contained a valid email address.
 */
function errorHandler(error, req, res, next) {
    req.body.email = '';

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

    postLookup(req.body.subscribed_url)
        .then(function (result) {
            if (result && result.post) {
                req.body.post_id = result.post.id;
            }

            next();
        })
        .catch(function (err) {
            if (err instanceof common.errors.NotFoundError) {
                return next();
            }

            next(err);
        });
}

function storeSubscriber(req, res, next) {
    req.body.status = 'subscribed';

    if (_.isEmpty(req.body.email)) {
        return next(new common.errors.ValidationError({message: 'Email cannot be blank.'}));
    } else if (!validator.isEmail(req.body.email)) {
        return next(new common.errors.ValidationError({message: 'Invalid email.'}));
    }

    return api.subscribers.add({subscribers: [req.body]}, {context: {external: true}})
        .then(function () {
            res.locals.success = true;
            next();
        })
        .catch(function () {
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
