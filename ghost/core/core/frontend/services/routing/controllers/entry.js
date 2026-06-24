const debug = require('@tryghost/debug')('services:routing:controllers:entry');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const dataService = require('../../data');
const renderer = require('../../rendering');
const markdown = require('./entry/markdown');
const giftLinks = require('./entry/gift-links');
const buildCanonicalUrl = require('./entry/canonical-url');

/**
 * The request's last url param is `/edit`: redirect to the admin editor, or fall
 * through to a 404 when admin redirects are disabled.
 *
 * @param {Object} res
 * @param {Function} next
 * @param {Object} entry
 * @returns {*}
 */
function editRedirect(res, next, entry) {
    if (!config.get('admin:redirects')) {
        debug('is edit url but admin redirects are disabled');
        return next();
    }

    debug('redirect. is edit url');
    const resourceType = res.routerOptions?.context?.includes('page') ? 'page' : 'post';
    return urlUtils.redirectToAdmin(302, res, `/#/editor/${resourceType}/${entry.id}`);
}

/**
 * The requested path no longer matches the entry's canonical url — happens with
 * date permalinks after a publish date change.
 *
 * @param {Object} req
 * @param {Object} entry
 * @returns {boolean}
 */
function isPermalinkStale(req, entry) {
    return urlUtils.absoluteToRelative(entry.url, {withoutSubdirectory: true}) !== req.path;
}

/**
 * @description Entry controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = async function entryController(req, res, next) {
    debug('entryController', res.routerOptions);

    try {
        const lookup = await dataService.entryLookup(req.path, res.routerOptions, res.locals);
        const entry = lookup ? lookup.entry : false;

        if (!entry || lookup.isUnknownOption) {
            debug('no entry or unknown option');
            return next();
        }

        if (lookup.isEditURL) {
            return editRedirect(res, next, entry);
        }

        // MUST run before the permalink redirect below: a `.md` path can never
        // equal the entry's canonical (html) path, so the redirect would always
        // fire and 301 the request to html, losing the markdown intent.
        if (markdown.isMdRequest(res)) {
            return markdown.serveMdRequest(req, res, entry);
        }

        if (isPermalinkStale(req, entry)) {
            debug('redirect');
            return urlUtils.redirect301(res, buildCanonicalUrl(req, entry));
        }

        // MUST run after the permalink redirect above: negotiation rides on the
        // canonical URL, so a stale dated-permalink URL is 301'd to canonical
        // first, then markdown is served.
        if (markdown.isAcceptsRequest(req, entry)) {
            return markdown.serveAcceptsRequest(res, entry);
        }

        if (giftLinks.isGiftRequest(req)) {
            return await giftLinks.serveGiftRequest(req, res, entry);
        }

        return renderer.renderEntry(req, res)(entry);
    } catch (err) {
        return renderer.handleError(next)(err);
    }
};
