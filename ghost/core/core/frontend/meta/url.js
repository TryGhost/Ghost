const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../shared/url-utils');
const {urlService} = require('../services/proxy');
const {checks} = require('../services/data');

// Canary: every serializer-fed path attaches `url`, so a post landing here
// without one is an unknown producer worth finding before the lazy cutover.
function warnMissingUrl(data) {
    logging.warn(new errors.InternalServerError({
        message: 'url helper fell back to the URL service for a post without a url',
        code: 'URL_HELPER_MISSING_URL',
        errorDetails: {
            id: data.id,
            slug: data.slug,
            resourceKeys: Object.keys(data)
        }
    }));
}

function getUrl(data, absolute) {
    if (checks.isPost(data)) {
        // The serializer-attached url is authoritative: it was computed from
        // the full model, and the serialized post no longer carries the
        // columns needed to recompute it. /404/ means the URL service had
        // nothing (unpublished or unrouted) — mirror the probe below without
        // re-asking the service.
        if (typeof data.url === 'string') {
            if (data.url.endsWith('/404/') && data.status !== 'published') {
                return urlUtils.urlFor({relativeUrl: urlUtils.urlJoin('/p', data.uuid, '/')}, null, absolute);
            }
            return absolute ? urlUtils.relativeToAbsolute(data.url) : urlUtils.absoluteToRelative(data.url);
        }

        warnMissingUrl(data);

        /**
         * @NOTE
         *
         * We return the post preview url if you are making use of the `{{url}}` helper and the post is not published.
         * If we don't do it, we can break Disqus a bit. See https://github.com/TryGhost/Ghost/issues/9727.
         *
         * This short term fix needs a better solution than this, because this is inconsistent with our private API. The
         * private API would still return /404/ for drafts. The public API doesn't serve any drafts - nothing we have to
         * worry about. We first would like to see if this resolves the Disqus bug when commenting on preview pages.
         *
         * A long term solution should be part of the final version of Dynamic Routing.
         */
        // checks.isPost matches both posts and pages (they share the Post
        // model and only differ on the page-only `show_title_and_feature_image`
        // field). Disambiguate so the router-level type is correct in both
        // cases.
        //
        // `status` is defaulted back because the Content API serializer strips
        // it (everything it serves is published); a post that still carries
        // one (preview/email-post renders) keeps it via spread order. The
        // preview probe stays keyed on the raw `data.status` so an unrouted
        // status-stripped post falls back to /p/:uuid.
        const postResource = {status: 'published', ...data, type: checks.isPage(data) ? 'pages' : 'posts'};
        if (data.status !== 'published' && urlService.facade.getUrlForResource(postResource) === '/404/') {
            return urlUtils.urlFor({relativeUrl: urlUtils.urlJoin('/p', data.uuid, '/')}, null, absolute);
        }

        return urlService.facade.getUrlForResource(postResource, {absolute: absolute, withSubdirectory: true});
    }

    if (checks.isTag(data)) {
        return urlService.facade.getUrlForResource({...data, type: 'tags'}, {absolute: absolute, withSubdirectory: true});
    }

    if (checks.isUser(data)) {
        return urlService.facade.getUrlForResource({...data, type: 'authors'}, {absolute: absolute, withSubdirectory: true});
    }

    if (checks.isNav(data)) {
        return urlUtils.urlFor('nav', {nav: data}, absolute);
    }

    return urlUtils.urlFor(data, {}, absolute);
}

module.exports = getUrl;
