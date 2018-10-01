const urlService = require('../../../services/url');
const {urlFor, makeAbsoluteUrls} = require('../../../services/url/utils');

const urlsForPost = (post, options) => {
    post.url = urlService.getUrlByResourceId(post.id);

    if (options.columns && !options.columns.includes('url')) {
        delete post.url;
    }

    if (options && options.context && options.context.public && options.absolute_urls) {
        if (post.feature_image) {
            post.feature_image = urlFor('image', {image: post.feature_image}, true);
        }

        if (post.og_image) {
            post.og_image = urlFor('image', {image: post.og_image}, true);
        }

        if (post.twitter_image) {
            post.twitter_image = urlFor('image', {image: post.twitter_image}, true);
        }

        if (post.html) {
            post.html = makeAbsoluteUrls(post.html, urlFor('home', true), post.url).html();
        }

        if (post.url) {
            post.url = urlFor({relativeUrl: post.url}, true);
        }
    }

    if (options && options.withRelated) {
        options.withRelated.forEach((relation) => {
            if (relation === 'tags' && post.tags) {
                post.tags = post.tags.map(tag => urlsForTag(tag, options));
            }

            if (relation === 'author' && post.author) {
                post.author = urlsForUser(post.author, options);
            }

            if (relation === 'authors' && post.authors) {
                post.authors = post.authors.map(author => urlsForUser(author, options));
            }
        });
    }

    return post;
};

const urlsForUser = (user, options) => {
    if (options && options.context && options.context.public && options.absolute_urls) {
        user.url = urlFor({
            relativeUrl: urlService.getUrlByResourceId(user.id)
        }, true);

        if (user.profile_image) {
            user.profile_image = urlFor('image', {image: user.profile_image}, true);
        }

        if (user.cover_image) {
            user.cover_image = urlFor('image', {image: user.cover_image}, true);
        }
    }

    return user;
};

const urlsForTag = (tag, options) => {
    if (options && options.context && options.context.public && options.absolute_urls) {
        tag.url = urlFor({
            relativeUrl: urlService.getUrlByResourceId(tag.id)
        }, true);

        if (tag.feature_image) {
            tag.feature_image = urlFor('image', {image: tag.feature_image}, true);
        }
    }

    return tag;
};

module.exports.urlsForPost = urlsForPost;
module.exports.urlsForUser = urlsForUser;
module.exports.urlsForTag = urlsForTag;
