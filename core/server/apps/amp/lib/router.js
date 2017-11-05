var path                = require('path'),
    express             = require('express'),
    ampRouter           = express.Router(),
    i18n                = require('../../../i18n'),

    // Dirty requires
    errors              = require('../../../errors'),
    templates           = require('../../../controllers/frontend/templates'),
    postLookup          = require('../../../controllers/frontend/post-lookup'),
    setResponseContext  = require('../../../controllers/frontend/context'),

    templateName = 'amp',
    defaultTemplate = path.resolve(__dirname, 'views', templateName + '.hbs');

function _renderer(req, res, next) {
    // Renderer begin
    // Format data
    var data = req.body || {};

    // CASE: we only support amp pages for posts that are not static pages
    if (!data.post || data.post.page) {
        return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
    }

    // Context
    setResponseContext(req, res, data);

    // Template
    res.template = templates.pickTemplate(templateName, defaultTemplate);

    // Render Call
    return res.render(res.template, data);
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
ampRouter.route('/')
    .get(
        getPostData,
        _renderer
    );

module.exports = ampRouter;
module.exports.renderer = _renderer;
module.exports.getPostData = getPostData;
