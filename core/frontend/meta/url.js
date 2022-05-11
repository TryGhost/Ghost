const urlUtils = require('../../shared/url-utils');
const urlService = require('../../server/services/url');
const {checks} = require('../services/data');

// This cleans the url from any `/amp` postfixes, so we'll never
// output a url with `/amp` in the end, except for the needed `amphtml`
// canonical link, which is rendered by `getAmpUrl`.
function sanitizeAmpUrl(url) {
    if (url.indexOf('/amp/') !== -1) {
        url = url.replace(/\/amp\/$/i, '/');
    }
    return url;
}

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
        if (data.status !== 'published' && urlService.getUrlByResourceId(data.id) === '/404/') {
            return urlUtils.urlFor({relativeUrl: urlUtils.urlJoin('/p', data.uuid, '/')}, null, absolute);
        }

        return urlService.getUrlByResourceId(data.id, {absolute: absolute, withSubdirectory: true});
    }

    if (checks.isTag(data) || checks.isUser(data)) {
        return urlService.getUrlByResourceId(data.id, {absolute: absolute, withSubdirectory: true});
    }

    if (checks.isNav(data)) {
        return urlUtils.urlFor('nav', {nav: data}, absolute);
    }

    // sanitize any trailing `/amp` in the url
    return sanitizeAmpUrl(urlUtils.urlFor(data, {}, absolute));
}

module.exports = getUrl;
