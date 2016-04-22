var path                = require('path'),
    express             = require('express'),
    subscribeRouter     = express.Router(),

    // Dirty requires
    api                 = require('../../../api'),
    errors              = require('../../../errors'),
    templates           = require('../../../controllers/frontend/templates'),
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

function storeSubscriber(req, res, next) {
    return api.subscribers.add({subscribers: [req.body]}, {context: {external: true}})
        .then(function () {
            res.locals.success = true;
            next();
        })
        .catch(function (error) {
            next(error);
        });
}

// subscribe frontend route
subscribeRouter.route('/')
    .get(
        controller
    )
    .post(
        honeyPot,
        storeSubscriber,
        controller
    );

// configure an error handler just for subscribe problems
subscribeRouter.use(errorHandler);

module.exports = subscribeRouter;
module.exports.controller = controller;
