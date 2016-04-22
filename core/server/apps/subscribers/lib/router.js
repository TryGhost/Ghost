var path                = require('path'),
    express             = require('express'),
    templates           = require('../../../controllers/frontend/templates'),
    setResponseContext  = require('../../../controllers/frontend/context'),
    api                 = require('../../../api'),
    subscribeRouter     = express.Router();

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

function errorHandler(err, req, res, next) {
    /*jshint unused:false */
    res.locals.error = err;
    return controller(req, res);
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
