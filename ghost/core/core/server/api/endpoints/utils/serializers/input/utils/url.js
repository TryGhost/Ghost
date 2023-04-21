const urlUtils = require('../../../../../../../shared/url-utils');

const handleImageUrl = (imageUrl) => {
    try {
        const imageURL = new URL(imageUrl, urlUtils.getSiteUrl());
        const siteURL = new URL(urlUtils.getSiteUrl());
        const subdir = siteURL.pathname.replace(/\/$/, '');
        const imagePathRe = new RegExp(`${subdir}/${urlUtils.STATIC_IMAGE_URL_PREFIX}`);

        if (imagePathRe.test(imageURL.pathname)) {
            return urlUtils.relativeToAbsolute(imageUrl);
        }

        return imageUrl;
    } catch (e) {
        return imageUrl;
    }
};

const forPost = (attrs, options) => {
    if (options && options.withRelated) {
        options.withRelated.forEach((relation) => {
            if (relation === 'tags' && attrs.tags) {
                attrs.tags = attrs.tags.map(tag => forTag(tag));
            }

            if (relation === 'author' && attrs.author) {
                attrs.author = forUser(attrs.author, options);
            }

            if (relation === 'authors' && attrs.authors) {
                attrs.authors = attrs.authors.map(author => forUser(author, options));
            }
        });
    }

    return attrs;
};

const forUser = (attrs) => {
    if (attrs.profile_image) {
        attrs.profile_image = handleImageUrl(attrs.profile_image);
    }

    if (attrs.cover_image) {
        attrs.cover_image = handleImageUrl(attrs.cover_image);
    }

    return attrs;
};

const forTag = (attrs) => {
    if (attrs.feature_image) {
        attrs.feature_image = handleImageUrl(attrs.feature_image);
    }

    return attrs;
};

const forSetting = (attrs) => {
    if (attrs.value && ['cover_image', 'logo', 'icon', 'portal_button_icon', 'og_image', 'twitter_image', 'pintura_js_url', 'pintura_css_url'].includes(attrs.key)) {
        attrs.value = urlUtils.relativeToAbsolute(attrs.value);
    }

    return attrs;
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSetting = forSetting;
