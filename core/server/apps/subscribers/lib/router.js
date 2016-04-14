var path                = require('path'),
    express             = require('express'),
    templates           = require('../../../controllers/frontend/templates'),
    setResponseContext  = require('../../../controllers/frontend/context'),
    api                 = require('../../../api'),
    subscribeRouter     = express.Router();

function controller(req, res) {
    var defaultView = path.resolve(__dirname, 'views', 'subscribe.hbs'),
        paths = templates.getActiveThemePaths(req.app.get('activeTheme')),
        data = {};

    if (res.error) {
        data.error = res.error;
    }

    setResponseContext(req, res);
    if (paths.hasOwnProperty('subscribe.hbs')) {
        return res.render('subscribe', data);
    } else {
        return res.render(defaultView, data);
    }
}


function storeSubscriber(req, res, next) {
    return api.subscribers.add({subscribers: [req.body]}, {context: {external: true}}).then(function (result) {
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
