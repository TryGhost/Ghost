const debug = require('@tryghost/debug')('services:routing:controllers:entry');
const url = require('url');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const dataService = require('../../data');
const renderer = require('../../rendering');

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

            if (entry.visibility === 'public') {
                const {getAcceptedMarkdownContentType, renderEntryMarkdown} = require('../../llms/markdown');
                const markdownContentType = getAcceptedMarkdownContentType(req);

                if (markdownContentType) {
                    const {createLlmsService} = require('../../llms/service');
                    const labs = require('../../../../shared/labs');
                    const settingsCache = require('../../../../shared/settings-cache');
                    const urlService = require('../../../../server/services/url');
                    const models = require('../../../../server/models');
                    const routing = require('../../routing');
                    const {api} = require('../../proxy');

                    const llmsService = createLlmsService({
                        settingsCache,
                        labs,
                        config,
                        urlServiceFacade: urlService.facade,
                        urlUtils,
                        models,
                        routing,
                        api
                    });

                    if (llmsService.isEnabled()) {
                        return llmsService.fetchPublicEntry(res.routerOptions.resourceType, entry.id)
                            .then((markdownEntry) => {
                                if (!markdownEntry) {
                                    return renderer.renderEntry(req, res)(entry);
                                }

                                const llmsIndexUrl = urlUtils.urlFor({relativeUrl: '/llms.txt'}, true);
                                res.set('Cache-Control', `public, max-age=${config.get('caching:llms:maxAge')}`);
                                res.vary('Accept');
                                res.type(markdownContentType);
                                return res.send(renderEntryMarkdown(markdownEntry, {llmsIndexUrl}));
                            });
                    }
                }
            }

            return renderer.renderEntry(req, res)(entry);
        })
        .catch(renderer.handleError(next));
};
