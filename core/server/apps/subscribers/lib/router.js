var path                = require('path'),
    express             = require('express'),
    _                   = require('lodash'),
    subscribeRouter     = express.Router(),

    // Dirty requires
    api                 = require('../../../api'),
    errors              = require('../../../errors'),
    templates           = require('../../../controllers/frontend/templates'),
    postlookup          = require('../../../controllers/frontend/post-lookup'),
    setResponseContext  = require('../../../controllers/frontend/context');

function controller(req, res) {
    var defaultView = path.resolve(__dirname, 'views', 'subscribe.hbs'),
        paths = templates.getActiveThemePaths(req.app.get('activeTheme')),
        data = req.body;

    setResponseContext(req, res);
    if (paths.hasOwnProperty('subscribe.hbs')) {
        return res.render('subscribe', data);
    } else {
        return res.render(defaultView, data);
    }
}

function errorHandler(error, req, res, next) {
    /*jshint unused:false */

    if (error.statusCode !== 404) {
        res.locals.error = error;
        return controller(req, res);
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

function handleSource(req, res, next) {
    req.body.subscribed_url = req.body.location;
    req.body.subscribed_referrer = req.body.referrer;
    delete req.body.location;
    delete req.body.referrer;

    postlookup(req.body.subscribed_url)
        .then(function (result) {
            if (result && result.post) {
                req.body.post_id = result.post.id;
            }

            next();
        })
        .catch(function (err) {
            if (err instanceof errors.NotFoundError) {
                return next();
            }

            next(err);
        });
}

function storeSubscriber(req, res, next) {
    req.body.status = 'subscribed';

    if (_.isEmpty(req.body.email)) {
        return next(new errors.ValidationError('Email cannot be blank.'));
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
subscribeRouter.route('/')
    .get(
        controller
    )
    .post(
        honeyPot,
        handleSource,
        storeSubscriber,
        controller
    );

// configure an error handler just for subscribe problems
subscribeRouter.use(errorHandler);

module.exports = subscribeRouter;
module.exports.controller = controller;
