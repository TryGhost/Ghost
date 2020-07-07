const _ = require('lodash');
const urlService = require('../../../../../../../frontend/services/url');
const urlUtils = require('../../../../../../../shared/url-utils');
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
     * That means the url is no longer /p/:uuid, it's e.g. GET /api/canary/content/preview/:uuid/.
     * /p/ is a concept of the site, not of core.
     *
     * The site is not aware of existing drafts. It won't be able to get the uuid.
     *
     * Needs further discussion.
     */
    if (!localUtils.isContentAPI(frame)) {
        if (attrs.status !== 'published' && attrs.url.match(/\/404\//)) {
            attrs.url = urlUtils.urlFor({
                relativeUrl: urlUtils.urlJoin('/p', attrs.uuid, '/')
            }, null, true);
        }
    }

    if (attrs.mobiledoc) {
        attrs.mobiledoc = urlUtils.mobiledocRelativeToAbsolute(
            attrs.mobiledoc,
            attrs.url
        );
    }

    ['html', 'codeinjection_head', 'codeinjection_foot'].forEach((attr) => {
        if (attrs[attr]) {
            attrs[attr] = urlUtils.htmlRelativeToAbsolute(
                attrs[attr],
                attrs.url
            );
        }
    });

    ['feature_image', 'canonical_url', 'posts_meta.og_image', 'posts_meta.twitter_image'].forEach((path) => {
        const value = _.get(attrs, path);
        if (value) {
            _.set(attrs, path, urlUtils.relativeToAbsolute(value));
        }
    });

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
        attrs.profile_image = urlUtils.urlFor('image', {image: attrs.profile_image}, true);
    }

    if (attrs.cover_image) {
        attrs.cover_image = urlUtils.urlFor('image', {image: attrs.cover_image}, true);
    }

    return attrs;
};

const forTag = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.getUrlByResourceId(id, {absolute: true});
    }

    if (attrs.feature_image) {
        attrs.feature_image = urlUtils.urlFor('image', {image: attrs.feature_image}, true);
    }

    return attrs;
};

const forSettings = (attrs) => {
    // @TODO: https://github.com/TryGhost/Ghost/issues/10106
    // @NOTE: Admin & Content API return a different format, need to mappers
    if (_.isArray(attrs)) {
        attrs.forEach((obj) => {
            if (['cover_image', 'logo', 'icon', 'portal_button_icon'].includes(obj.key) && obj.value) {
                obj.value = urlUtils.urlFor('image', {image: obj.value}, true);
            }
        });
    } else {
        if (attrs.cover_image) {
            attrs.cover_image = urlUtils.urlFor('image', {image: attrs.cover_image}, true);
        }

        if (attrs.logo) {
            attrs.logo = urlUtils.urlFor('image', {image: attrs.logo}, true);
        }

        if (attrs.icon) {
            attrs.icon = urlUtils.urlFor('image', {image: attrs.icon}, true);
        }
    }

    return attrs;
};

const forImage = (path) => {
    return urlUtils.urlFor('image', {image: path}, true);
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSettings = forSettings;
module.exports.forImage = forImage;
