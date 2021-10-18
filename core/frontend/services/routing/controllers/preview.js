const debug = require('@tryghost/debug')('services:routing:controllers:preview');
const config = require('../../../../shared/config');
const {routerManager} = require('../');
const urlUtils = require('../../../../shared/url-utils');
const helpers = require('../helpers');

/**
 * @description Preview Controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function previewController(req, res, next) {
    debug('previewController');

    const api = require('../../proxy').api[res.locals.apiVersion];

    const params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'authors,tags'
    };

    return api[res.routerOptions.query.controller]
        .read(params)
        .then(function then(result) {
            const post = result[res.routerOptions.query.resource][0];

            if (!post) {
                return next();
            }

            if (req.params.options && req.params.options.toLowerCase() === 'edit') {
                // CASE: last param of the url is /edit but admin redirects are disabled
                if (!config.get('admin:redirects')) {
                    return next();
                }

                // @TODO: we don't know which resource type it is, because it's a generic preview handler and the
                //        preview API returns {previews: []}
                // @TODO: figure out how to solve better
                const resourceType = post.page ? 'page' : 'post';

                // CASE: last param of the url is /edit, redirect to admin
                return urlUtils.redirectToAdmin(302, res, `/#/editor/${resourceType}/${post.id}`);
            } else if (req.params.options) {
                // CASE: unknown options param detected, ignore
                return next();
            }

            if (post.status === 'published') {
                return urlUtils.redirect301(res, routerManager.getUrlByResourceId(post.id, {withSubdirectory: true}));
            }

            if (res.locals.apiVersion !== 'v0.1' && res.locals.apiVersion !== 'v2') {
                post.access = !!post.html;
            }

            // @TODO: See helpers/secure
            helpers.secure(req, post);

            const renderer = helpers.renderEntry(req, res);
            return renderer(post);
        })
        .catch(helpers.handleError(next));
};
