const debug = require('@tryghost/debug')('services:routing:controllers:entry');
const url = require('url');
const _ = require('lodash');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const dataService = require('../../data');
const renderer = require('../../rendering');
const proxy = require('../../proxy');
const hbs = require('../../theme-engine/engine');
const {getAcceptedMarkdownContentType, getMarkdownPath, renderEntryMarkdown} = require('../../llms/markdown');

function getLlmsService(req) {
    return req.app.get('llmsService') || null;
}

function serveMarkdown(res, entry) {
    const llmsIndexUrl = urlUtils.urlFor({relativeUrl: '/llms.txt'}, true);
    res.set('Cache-Control', `public, max-age=${config.get('caching:llms:maxAge')}`);
    res.set('Content-Location', getMarkdownPath(new URL(entry.url).pathname));
    res.type('text/markdown');
    return res.send(renderEntryMarkdown(entry, {llmsIndexUrl}));
}

/**
 * Build this request's URL with `?gift` removed, preserving path, subdirectory
 * and other query params. Rebuilt from req.query (qs-parsed) so bracket forms
 * like `?gift[]=x` are dropped too — otherwise the stripped redirect would loop.
 *
 * @param {Object} req
 * @returns {string}
 */
function strippedGiftUrl(req) {
    const query = {...req.query};
    delete query.gift;
    return url.format({pathname: url.parse(req.originalUrl).pathname, query});
}

/**
 * Flag the render as a gift view so `ghost_foot` injects the toast. Stores the
 * token (not just a boolean) for a later analytics pass-through. Internal flag,
 * not a public theme API.
 *
 * @param {Object} res
 * @param {string} token
 */
function setGiftTemplateFlag(res, token) {
    const localTemplateOptions = hbs.getLocalTemplateOptions(res.locals);
    hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
        data: {_gift: token}
    }));
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

        // Format data 1
        const entry = lookup ? lookup.entry : false;

        if (!entry) {
            debug('no entry');
            return next();
        }

        // CASE: postlookup can detect options for example /edit, unknown options get ignored and end in 404
        if (lookup.isUnknownOption) {
            debug('isUnknownOption');
            return next();
        }

        // CASE: last param is of url is /edit, redirect to admin
        if (lookup.isEditURL) {
            if (!config.get('admin:redirects')) {
                debug('is edit url but admin redirects are disabled');
                return next();
            }

            debug('redirect. is edit url');
            const resourceType = res.routerOptions?.context?.includes('page') ? 'page' : 'post';

            return urlUtils.redirectToAdmin(302, res, `/#/editor/${resourceType}/${entry.id}`);
        }

        // CASE: .md URL — serve entry as markdown for LLM consumption
        if (res.routerOptions.isMarkdownRequest) {
            const llmsService = getLlmsService(req);
            if (!llmsService || !llmsService.isEnabled()) {
                return res.redirect(302, url.format({
                    pathname: url.parse(entry.url).pathname,
                    search: url.parse(req.originalUrl).search
                }));
            }

            if (entry.visibility !== 'public') {
                return res.status(403).type('text/markdown').send(
                    '# Members-only content\n\nThis post requires a subscription and is not available for public access.\n'
                );
            }

            return serveMarkdown(res, entry);
        }

        /**
         * CASE: Permalink is not valid anymore, we redirect him permanently to the correct one
         *       This should only happen if you have date permalinks enabled and you change
         *       your publish date.
         *
         * @NOTE:
         *
         * Ensure we redirect to the correct post url including subdirectory.
         */
        if (urlUtils.absoluteToRelative(entry.url, {withoutSubdirectory: true}) !== req.path) {
            debug('redirect');

            return urlUtils.redirect301(res, url.format({
                pathname: url.parse(entry.url).pathname,
                search: url.parse(req.originalUrl).search
            }));
        }

        // CASE: Accept: text/markdown content negotiation
        if (entry.visibility === 'public') {
            const markdownContentType = getAcceptedMarkdownContentType(req);

            if (markdownContentType) {
                const llmsService = getLlmsService(req);

                if (llmsService && llmsService.isEnabled()) {
                    res.vary('Accept');
                    return serveMarkdown(res, entry);
                }
            }
        }

        // CASE: gift-link reader access. A gift link is the post's real URL plus
        // `?gift=TOKEN`; the token is verified against the entry living at this
        // URL, so a token for one post can never unlock another.
        if (proxy.labs.isSet('giftLinks') && req.query?.gift !== undefined) {
            // A non-string form (e.g. `?gift[]=x`) isn't a token — strip it.
            const token = typeof req.query.gift === 'string' ? req.query.gift : null;

            if (token && await proxy.giftLinks.service.isValidTokenForPost(token, entry.id)) {
                // Re-read as a paid-member shim (the grant `/p/` previews use) to
                // reveal gated content. Passed as the read context only, so it
                // never leaks into res.locals/@member.
                const giftLookup = await dataService.entryLookup(req.path, res.routerOptions, {
                    ...res.locals,
                    member: await proxy.createPaidMemberShim()
                });

                // Don't index the unlocked variant; keep the token out of the
                // Referer on sub-resource requests.
                res.set('X-Robots-Tag', 'noindex');
                res.set('Referrer-Policy', 'no-referrer');
                setGiftTemplateFlag(res, token);

                return renderer.renderEntry(req, res)(giftLookup.entry);
            }

            // Invalid token, or one for a different post: strip it and 301 to the
            // clean URL (the page still renders, paywalled). res.redirect, not
            // urlUtils.redirect301, so the no-store set for ?gift requests survives
            // and the token-bearing redirect isn't cached.
            return res.redirect(301, strippedGiftUrl(req));
        }

        return renderer.renderEntry(req, res)(entry);
    } catch (err) {
        return renderer.handleError(next)(err);
    }
};
