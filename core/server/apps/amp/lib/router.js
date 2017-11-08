var path                = require('path'),
    express             = require('express'),
    ampRouter           = express.Router(),
    i18n                = require('../../../i18n'),

    // Dirty requires
    errors              = require('../../../errors'),
    templates           = require('../../../controllers/frontend/templates'),
    postLookup          = require('../../../controllers/frontend/post-lookup'),
    setResponseContext  = require('../../../controllers/frontend/context');

function controller(req, res, next) {
    var templateName = 'amp',
        defaultTemplate = path.resolve(__dirname, 'views', templateName + '.hbs'),
        view = templates.pickTemplate(templateName, defaultTemplate),
        data = req.body || {};

    // CASE: we only support amp pages for posts that are not static pages
    if (!data.post || data.post.page) {
        return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
    }

    setResponseContext(req, res, data);

    return res.render(view, data);
}

function getPostData(req, res, next) {
    req.body = req.body || {};

    postLookup(res.locals.relativeUrl)
        .then(function (result) {
            if (result && result.post) {
                req.body.post = result.post;
            }

            next();
        })
        .catch(next);
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
