const path = require('path'),
    express = require('express'),
    ampRouter = express.Router(),

    // Dirty requires
    common = require('../../../lib/common'),
    urlService = require('../../../services/url'),
    helpers = require('../../../services/routing/helpers'),
    templateName = 'amp';

function _renderer(req, res, next) {
    res.routerOptions = {
        type: 'custom',
        templates: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', `${templateName}.hbs`)
    };

    // Renderer begin
    // Format data
    let data = req.body || {};

    // CASE: we only support amp pages for posts that are not static pages
    if (!data.post || data.post.page) {
        return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
    }

    // Render Call
    return helpers.renderer(req, res, data);
}

// This here is a controller.
// In fact, this whole file is nothing more than a controller + renderer & doesn't need to be a router
function getPostData(req, res, next) {
    req.body = req.body || {};

    const urlWithoutSubdirectoryWithoutAmp = res.locals.relativeUrl.match(/(.*?\/)amp\/?$/)[1];

    /**
     * @NOTE
     *
     * We have to figure out the target permalink, otherwise it would be possible to serve a post
     * which lives in two collections.
     *
     * @TODO:
     *
     * This is not optimal and caused by the fact how apps currently work. But apps weren't designed
     * for dynamic routing.
     *
     * I think if the responsible, target router would first take care fetching/determining the post, the
     * request could then be forwarded to this app. Then we don't have to:
     *
     * 1. care about fetching the post
     * 2. care about if the post can be served
     * 3. then this app would act like an extension
     *
     * The challenge is to design different types of apps e.g. extensions of routers, standalone pages etc.
     */
    const permalinks = urlService.getPermalinkByUrl(urlWithoutSubdirectoryWithoutAmp, {withUrlOptions: true});

    if (!permalinks) {
        return next(new common.errors.NotFoundError({
            message: common.i18n.t('errors.errors.pageNotFound')
        }));
    }

    // @NOTE: amp is not supported for static pages
    // @TODO: https://github.com/TryGhost/Ghost/issues/10548
    helpers.entryLookup(urlWithoutSubdirectoryWithoutAmp, {permalinks, query: {controller: 'postsPublic', resource: 'posts'}}, res.locals)
        .then((result) => {
            if (result && result.entry) {
                req.body.post = result.entry;
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
