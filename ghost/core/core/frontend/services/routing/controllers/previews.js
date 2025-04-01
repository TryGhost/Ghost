const debug = require('@tryghost/debug')('services:routing:controllers:preview');
const config = require('../../../../shared/config');
const {routerManager} = require('../');
const urlUtils = require('../../../../shared/url-utils');
const renderer = require('../../rendering');

/**
 * @description Preview Controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function previewController(req, res, next) {
    debug('previewController');

    const api = require('../../proxy').api;

    const params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'authors,tags,tiers',
        member_status: req.query?.member_status
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
                const resourceType = post.type;

                // CASE: last param of the url is /edit, redirect to admin
                return urlUtils.redirectToAdmin(302, res, `/#/editor/${resourceType}/${post.id}`);
            } else if (req.params.options) {
                // CASE: unknown options param detected, ignore
                return next();
            }

            // published content should only resolve to /:slug - /p/:uuid is for drafts only in lieu of an actual preview api
            if (post.status === 'published') {
                return urlUtils.redirect301(res, routerManager.getUrlByResourceId(post.id, {withSubdirectory: true}));
            }

            // once an email-only post has been sent it shouldn't be available via /p/ to avoid leaking members-only content
            if (post.status === 'sent') {
                return urlUtils.redirect301(res, urlUtils.urlJoin('/email', post.uuid, '/'));
            }

            post.access = !!post.html;

            return renderer.renderEntry(req, res)(post);
        })
        .catch(renderer.handleError(next));
};
