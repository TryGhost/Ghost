const debug = require('@tryghost/debug')('services:routing:controllers:emailpost');
const config = require('../../../../shared/config');
const urlService = require('../../url');
const urlUtils = require('../../../../shared/url-utils');
const helpers = require('../helpers');

/**
 * @description Email Post Controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function emailPostController(req, res, next) {
    debug('emailPostController');

    const api = require('../../proxy').api[res.locals.apiVersion];

    const params = {
        uuid: req.params.uuid,
        include: 'authors,tags',
        context: {
            member: res.locals.member
        }
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

                // CASE: last param of the url is /edit, redirect to admin
                // NOTE: only 'post' resources support email-only mode
                return urlUtils.redirectToAdmin(302, res, `/#/editor/post/${post.id}`);
            } else if (req.params.options) {
                // CASE: unknown options param detected, ignore
                return next();
            }

            if (post.status === 'published') {
                return urlUtils.redirect301(res, urlService.getUrlByResourceId(post.id, {withSubdirectory: true}));
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
