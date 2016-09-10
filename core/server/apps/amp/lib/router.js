var path                = require('path'),
    express             = require('express'),
    _                   = require('lodash'),
    ampRouter           = express.Router(),

    // Dirty requires
    errors              = require('../../../errors'),
    templates           = require('../../../controllers/frontend/templates'),
    postLookup          = require('../../../controllers/frontend/post-lookup'),
    setResponseContext  = require('../../../controllers/frontend/context');

function controller(req, res, next) {
    var defaultView = path.resolve(__dirname, 'views', 'amp.hbs'),
        paths = templates.getActiveThemePaths(req.app.get('activeTheme')),
        data = req.body;

    if (res.error) {
        data.error = res.error;
    }

    setResponseContext(req, res, data);

    // we have to check the context. Our context must be ['post', 'amp'], otherwise we won't render the template
    if (_.includes(res.locals.context, 'post') && _.includes(res.locals.context, 'amp')) {
        if (paths.hasOwnProperty('amp.hbs')) {
            return res.render('amp', data);
        } else {
            return res.render(defaultView, data);
        }
    } else {
        return next();
    }
}

function getPostData(req, res, next) {
    postLookup(res.locals.relativeUrl)
        .then(function (result) {
            if (result && result.post) {
                req.body.post = result.post;
            }

            next();
        })
        .catch(function (err) {
            if (err instanceof errors.NotFoundError) {
                return next(err);
            }

            next(err);
        });
}

// AMP frontend route
ampRouter.route('/')
    .get(
        getPostData,
        controller
    );

module.exports = ampRouter;
module.exports.controller = controller;
module.exports.getPostData = getPostData;
