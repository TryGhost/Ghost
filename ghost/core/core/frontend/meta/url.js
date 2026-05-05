const urlUtils = require('../../shared/url-utils');
const urlService = require('../../server/services/url');
const {checks} = require('../services/data');

function getUrl(data, absolute) {
    if (checks.isPost(data)) {
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
        const postResource = {...data, type: checks.isPage(data) ? 'pages' : 'posts'};
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
