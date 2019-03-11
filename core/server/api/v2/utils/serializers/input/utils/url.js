const _ = require('lodash');
const {absoluteToRelative, getBlogUrl, STATIC_IMAGE_URL_PREFIX} = require('../../../../../../services/url/utils');

const handleCanonicalUrl = (url) => {
    const blogDomain = getBlogUrl().replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    const absolute = url.replace(/^http(s?):\/\//, '');

    if (absolute.startsWith(blogDomain)) {
        return absoluteToRelative(url, {withoutSubdirectory: true});
    }

    return url;
};

const handleImageUrl = (imageUrl) => {
    const blogDomain = getBlogUrl().replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    const imageUrlAbsolute = imageUrl.replace(/^http(s?):\/\//, '');
    const imagePathRe = new RegExp(`^${blogDomain}/${STATIC_IMAGE_URL_PREFIX}`);

    if (imagePathRe.test(imageUrlAbsolute)) {
        return absoluteToRelative(imageUrl);
    }

    return imageUrl;
};

const handleContentUrls = (content) => {
    const blogDomain = getBlogUrl().replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    const imagePathRe = new RegExp(`(http(s?)://)?${blogDomain}/${STATIC_IMAGE_URL_PREFIX}`, 'g');

    const matches = _.uniq(content.match(imagePathRe));

    if (matches) {
        matches.forEach((match) => {
            const relative = absoluteToRelative(match);
            content = content.replace(new RegExp(match, 'g'), relative);
        });
    }

    return content;
};

const forPost = (attrs, options) => {
    // make all content image URLs relative, ref: https://github.com/TryGhost/Ghost/issues/10477
    if (attrs.mobiledoc) {
        attrs.mobiledoc = handleContentUrls(attrs.mobiledoc);
    }

    if (attrs.feature_image) {
        attrs.feature_image = handleImageUrl(attrs.feature_image);
    }

    if (attrs.og_image) {
        attrs.og_image = handleImageUrl(attrs.og_image);
    }

    if (attrs.twitter_image) {
        attrs.twitter_image = handleImageUrl(attrs.twitter_image);
    }

    if (attrs.canonical_url) {
        attrs.canonical_url = handleCanonicalUrl(attrs.canonical_url);
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

const forSetting = (attrs) => {
    if (attrs.value) {
        attrs.value = handleImageUrl(attrs.value);
    }

    return attrs;
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSetting = forSetting;
