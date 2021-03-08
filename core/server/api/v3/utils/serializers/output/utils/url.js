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
     * That means the url is no longer /p/:uuid, it's e.g. GET /api/v3/content/preview/:uuid/.
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

    ['mobiledoc', 'html', 'plaintext', 'codeinjection_head', 'codeinjection_foot', 'feature_image', 'canonical_url', 'posts_meta.og_image', 'posts_meta.twitter_image'].forEach((path) => {
        const value = _.get(attrs, path);
        if (value) {
            _.set(attrs, path, urlUtils.transformReadyToAbsolute(value));
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

    ['profile_image', 'cover_image'].forEach((attr) => {
        if (attrs[attr]) {
            attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
        }
    });

    return attrs;
};

const forTag = (id, attrs, options) => {
    if (!options.columns || (options.columns && options.columns.includes('url'))) {
        attrs.url = urlService.getUrlByResourceId(id, {absolute: true});
    }

    ['feature_image', 'og_image', 'twitter_image', 'codeinjection_head', 'codeinjection_foot'].forEach((attr) => {
        if (attrs[attr]) {
            attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
        }
    });

    return attrs;
};

const forSettings = (attrs) => {
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
