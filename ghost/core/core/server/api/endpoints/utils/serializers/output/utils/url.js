const urlService = require('../../../../../../services/url');
const urlUtils = require('../../../../../../../shared/url-utils');
const localUtils = require('../../../index');

const forPost = (id, attrs, frame, type = 'posts') => {
    // `forPost` is shared between the posts and pages mappers (pages.js
    // delegates to posts.js). The router-level resource type is passed in
    // explicitly because `attrs.type` can't be relied on — `?fields=url`
    // strips every attribute except the requested ones, so deriving the
    // type from `attrs` would silently fall back to 'posts' for pages.
    // The mapper that owns the resource always knows which it is.
    //
    // `id` is passed separately for the same reason: without it, the eager
    // facade's id-based fallback hits /404/ for every record.
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

    // The lazyRouting input-serializer fix force-loads tags+authors when
    // `?fields=url` is requested so the URL serializer can evaluate
    // tag- and author-filtered routes. The framework's column filter only
    // strips scalar attributes — Bookshelf relations land on the JSON
    // before the strip and would otherwise bleed into the response. Strip
    // only relations we force-loaded ourselves (tagged on the frame by
    // the input serializer); relations the caller explicitly asked for
    // via `?include=` stay in the response.
    const forceLoaded = frame.options._forceLoadedForUrl;
    if (Array.isArray(forceLoaded) && frame.options.columns) {
        for (const key of forceLoaded) {
            if (!frame.options.columns.includes(key) && Object.hasOwn(attrs, key)) {
                delete attrs[key];
            }
        }
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
