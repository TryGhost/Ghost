var path                = require('path'),
    express             = require('express'),
    _                   = require('lodash'),
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

function storeSubscriber(req, res, next) {
    return api.subscribers.add({subscribers: [req.body]}, {context: {external: true}})
        .then(function () {
            res.locals.success = true;
            next();
        })
        .catch(function (error) {
            res.locals.error = error;
            next();
        });
    }

// subscribe frontend route
subscribeRouter.route('/')
    .get(
        controller
    )
    .post(
        storeSubscriber,
        controller
    );

module.exports = subscribeRouter;
module.exports.controller = controller;
