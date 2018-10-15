const urlService = require('../../../../../../services/url');
const {urlFor, makeAbsoluteUrls} = require('../../../../../../services/url/utils');

const forPost = (id, attrs, options) => {
    attrs.url = urlService.getUrlByResourceId(id, {absolute: true});

    if (attrs.feature_image) {
        attrs.feature_image = urlFor('image', {image: attrs.feature_image}, true);
    }

    if (attrs.og_image) {
        attrs.og_image = urlFor('image', {image: attrs.og_image}, true);
    }

    if (attrs.twitter_image) {
        attrs.twitter_image = urlFor('image', {image: attrs.twitter_image}, true);
    }

    if (attrs.html) {
        attrs.html = makeAbsoluteUrls(attrs.html, urlFor('home', true), attrs.url).html();
    }

    if (options.columns && !options.columns.includes('url')) {
        delete attrs.url;
    }

    if (options && options.withRelated) {
        options.withRelated.forEach((relation) => {
            // @NOTE: this block also decorates primary_tag/primary_author objects as they
            // are being passed by reference in tags/authors. Might be refactored into more explicit call
            // in the future, but is good enough for current use-case
            if (relation === 'tags' && attrs.tags) {
                attrs.tags = attrs.tags.map(tag => forTag(tag.id, tag));
            }

            if (relation === 'author' && attrs.author) {
                attrs.author = forUser(attrs.author.id, attrs.author, options);
            }

            if (relation === 'authors' && attrs.authors) {
                attrs.authors = attrs.authors.map(author => forUser(author.id, author, options));
            }
        });
    }

    return attrs;
};

const forUser = (id, attrs) => {
    attrs.url = urlService.getUrlByResourceId(id, {absolute: true});

    if (attrs.profile_image) {
        attrs.profile_image = urlFor('image', {image: attrs.profile_image}, true);
    }

    if (attrs.cover_image) {
        attrs.cover_image = urlFor('image', {image: attrs.cover_image}, true);
    }

    return attrs;
};

const forTag = (id, attrs) => {
    attrs.url = urlService.getUrlByResourceId(id, {absolute: true});

    if (attrs.feature_image) {
        attrs.feature_image = urlFor('image', {image: attrs.feature_image}, true);
    }

    return attrs;
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
