const debug = require('@tryghost/debug')('services:routing:controllers:entry');
const url = require('url');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const dataService = require('../../data');
const renderer = require('../../rendering');
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
 * @description Entry controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function entryController(req, res, next) {
    debug('entryController', res.routerOptions);

    return dataService.entryLookup(req.path, res.routerOptions, res.locals)
        .then(function then(lookup) {
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

            return renderer.renderEntry(req, res)(entry);
        })
        .catch(renderer.handleError(next));
};
