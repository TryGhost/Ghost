const urlService = require('../../../../../../services/url');
const urlUtils = require('../../../../../../../shared/url-utils');
const localUtils = require('../../../index');

const forPost = (id, attrs, frame) => {
    // `forPost` is shared between the posts and pages mappers (pages.js
    // delegates to posts.js). The router-level resource type therefore has
    // to be derived from `attrs.type` ('post' / 'page') rather than hardcoded
    // — otherwise the facade would dispatch a page record against the posts
    // router. `id` is passed separately because callers may filter `attrs`
    // via `fields=url`, which strips every attribute except the requested
    // ones; without the explicit `id`, the eager facade's id-based fallback
    // hits /404/ for every record.
    const type = attrs.type === 'page' ? 'pages' : 'posts';
    attrs.url = urlService.facade.getUrlForResource({...attrs, id, type}, {absolute: true});

    /**
     * CASE: admin api should serve preview urls
     *
     * @NOTE
     * The url service has no clue of the draft/scheduled concept. It only generates urls for published resources.
     * Adding a hardcoded fallback into the url service feels wrong IMO.
     *
     * Imagine the site won't be part of core and core does not serve urls anymore.
     * Core needs to offer a preview API, which returns draft posts.
     * That means the url is no longer /p/:uuid, it's e.g. GET /api/content/preview/:uuid/.
     * /p/ is a concept of the site, not of core.
     *
     * The site is not aware of existing drafts. It won't be able to get the uuid.
     *
     * Needs further discussion.
     */
    if (!localUtils.isContentAPI(frame)) {
        if (attrs.status !== 'published' && attrs.url.match(/\/404\//)) {
            if (attrs.posts_meta && attrs.posts_meta.email_only) {
                attrs.url = urlUtils.urlFor({
                    relativeUrl: urlUtils.urlJoin('/email', attrs.uuid, '/')
                }, null, true);
            } else {
                attrs.url = urlUtils.urlFor({
                    relativeUrl: urlUtils.urlJoin('/p', attrs.uuid, '/')
                }, null, true);
            }
        }
    }

    if (frame.options.columns && !frame.options.columns.includes('url')) {
        delete attrs.url;
    }

    return attrs;
};

const forUser = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.facade.getUrlForResource({...attrs, id, type: 'authors'}, {absolute: true});
    }

    return attrs;
};

const forTag = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.facade.getUrlForResource({...attrs, id, type: 'tags'}, {absolute: true});
    }

    return attrs;
};

const forImage = (path) => {
    return urlUtils.urlFor('image', {image: path}, true);
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forImage = forImage;
