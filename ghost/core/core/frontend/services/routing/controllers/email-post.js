const debug = require('@tryghost/debug')('services:routing:controllers:emailpost');
const config = require('../../../../shared/config');
const {routerManager} = require('../');
const urlUtils = require('../../../../shared/url-utils');
const renderer = require('../../rendering');

/**
 * @description Email Post Controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function emailPostController(req, res, next) {
    debug('emailPostController');

    const api = require('../../proxy').api;

    const params = {
        uuid: req.params.uuid,
        include: 'authors,tags,tiers',
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
                return urlUtils.redirect301(res, routerManager.getUrlByResourceId(post.id, {withSubdirectory: true}));
            }

            return renderer.renderEntry(req, res)(post);
        })
        .catch(renderer.handleError(next));
};
