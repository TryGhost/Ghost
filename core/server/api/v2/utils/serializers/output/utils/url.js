const _ = require('lodash');
const urlService = require('../../../../../../services/url');
const localUtils = require('../../../index');

const forPost = (id, attrs, frame) => {
    attrs.url = urlService.getUrlByResourceId(id, {absolute: true});

    /**
     * CASE: admin api should serve preview urls
     *
     * @NOTE
     * The url service has no clue of the draft/scheduled concept. It only generates urls for published resources.
     * Adding a hardcoded fallback into the url service feels wrong IMO.
     *
     * Imagine the site won't be part of core and core does not serve urls anymore.
     * Core needs to offer a preview API, which returns draft posts.
     * That means the url is no longer /p/:uuid, it's e.g. GET /api/v2/content/preview/:uuid/.
     * /p/ is a concept of the site, not of core.
     *
     * The site is not aware of existing drafts. It won't be able to get the uuid.
     *
     * Needs further discussion.
     */
    if (!localUtils.isContentAPI(frame)) {
        if (attrs.status !== 'published' && attrs.url.match(/\/404\//)) {
            attrs.url = urlService
                .utils
                .urlFor({
                    relativeUrl: urlService.utils.urlJoin('/p', attrs.uuid, '/')
                }, null, true);
        }
    }

    if (attrs.feature_image) {
        attrs.feature_image = urlService.utils.urlFor('image', {image: attrs.feature_image}, true);
    }

    if (attrs.og_image) {
        attrs.og_image = urlService.utils.urlFor('image', {image: attrs.og_image}, true);
    }

    if (attrs.twitter_image) {
        attrs.twitter_image = urlService.utils.urlFor('image', {image: attrs.twitter_image}, true);
    }

    if (attrs.canonical_url) {
        attrs.canonical_url = urlService.utils.relativeToAbsolute(attrs.canonical_url);
    }

    if (attrs.html) {
        const urlOptions = {
            assetsOnly: true
        };

        if (frame.options.absolute_urls) {
            urlOptions.assetsOnly = false;
        }

        attrs.html = urlService.utils.makeAbsoluteUrls(
            attrs.html,
            urlService.utils.urlFor('home', true),
            attrs.url,
            urlOptions
        ).html();
    }

    if (frame.options.columns && !frame.options.columns.includes('url')) {
        delete attrs.url;
    }

    return attrs;
};

const forUser = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.getUrlByResourceId(id, {absolute: true});
    }

    if (attrs.profile_image) {
        attrs.profile_image = urlService.utils.urlFor('image', {image: attrs.profile_image}, true);
    }

    if (attrs.cover_image) {
        attrs.cover_image = urlService.utils.urlFor('image', {image: attrs.cover_image}, true);
    }

    return attrs;
};

const forTag = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.getUrlByResourceId(id, {absolute: true});
    }

    if (attrs.feature_image) {
        attrs.feature_image = urlService.utils.urlFor('image', {image: attrs.feature_image}, true);
    }

    return attrs;
};

const forSettings = (attrs) => {
    // @TODO: https://github.com/TryGhost/Ghost/issues/10106
    // @NOTE: Admin & Content API return a different format, need to mappers
    if (_.isArray(attrs)) {
        attrs.forEach((obj) => {
            if (['cover_image', 'logo', 'icon'].includes(obj.key) && obj.value) {
                obj.value = urlService.utils.urlFor('image', {image: obj.value}, true);
            }
        });
    } else {
        if (attrs.cover_image) {
            attrs.cover_image = urlService.utils.urlFor('image', {image: attrs.cover_image}, true);
        }

        if (attrs.logo) {
            attrs.logo = urlService.utils.urlFor('image', {image: attrs.logo}, true);
        }

        if (attrs.icon) {
            attrs.icon = urlService.utils.urlFor('image', {image: attrs.icon}, true);
        }
    }

    return attrs;
};

const forImage = (path) => {
    return urlService.utils.urlFor('image', {image: path}, true);
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSettings = forSettings;
module.exports.forImage = forImage;
