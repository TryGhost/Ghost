const {absoluteToRelative, getBlogUrl, STATIC_IMAGE_URL_PREFIX} = require('../../../../../../services/url/utils');

const handleImageUrl = (imageUrl) => {
    const blogUrl = getBlogUrl().replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    const imageUrlAbsolute = imageUrl.replace(/^http(s?):\/\//, '');
    const imagePathRe = new RegExp(`^${blogUrl}/${STATIC_IMAGE_URL_PREFIX}`);
    if (imagePathRe.test(imageUrlAbsolute)) {
        return absoluteToRelative(imageUrl);
    }
    return imageUrl;
};

const forPost = (attrs, options) => {
    if (attrs.feature_image) {
        attrs.feature_image = handleImageUrl(attrs.feature_image);
    }

    if (attrs.og_image) {
        attrs.og_image = handleImageUrl(attrs.og_image);
    }

    if (attrs.twitter_image) {
        attrs.twitter_image = handleImageUrl(attrs.twitter_image);
    }

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

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
