var path = require('path'),
    express = require('express'),
    ampRouter = express.Router(),

    // Dirty requires
    common = require('../../../lib/common'),
    postLookup = require('../../../controllers/frontend/post-lookup'),
    renderer = require('../../../controllers/frontend/renderer'),

    templateName = 'amp';

function _renderer(req, res, next) {
    // Note: this is super similar to the config middleware used in channels
    // @TODO refactor into to something explicit & DRY this up
    res._route = {
        type: 'custom',
        templateName: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', templateName + '.hbs')
    };

    // Renderer begin
    // Format data
    var data = req.body || {};

    // CASE: we only support amp pages for posts that are not static pages
    if (!data.post || data.post.page) {
        return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
    }

    // Render Call
    return renderer(req, res, data);
}

// This here is a controller.
// In fact, this whole file is nothing more than a controller + renderer & doesn't need to be a router
function getPostData(req, res, next) {
    req.body = req.body || {};

    postLookup(res.locals.relativeUrl)
        .then(function handleResult(result) {
            if (result && result.post) {
                req.body.post = result.post;
            }

            next();
        })
        .catch(next);
}

// AMP frontend route
ampRouter
    .route('/')
    .get(
        getPostData,
        _renderer
    );

module.exports = ampRouter;
module.exports.renderer = _renderer;
module.exports.getPostData = getPostData;
