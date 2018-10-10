const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:posts');
const urlService = require('../../../../../services/url');

// @TODO: refactor if we add users+tags controllers
const urlsForUser = (user) => {
    user.url = urlService.getUrlByResourceId(user.id, {absolute: true});

    if (user.profile_image) {
        user.profile_image = urlService.utils.urlFor('image', {image: user.profile_image}, true);
    }

    if (user.cover_image) {
        user.cover_image = urlService.utils.urlFor('image', {image: user.cover_image}, true);
    }

    return user;
};

const urlsForTag = (tag) => {
    tag.url = urlService.getUrlByResourceId(tag.id, {absolute: true});

    if (tag.feature_image) {
        tag.feature_image = urlService.utils.urlFor('image', {image: tag.feature_image}, true);
    }

    return tag;
};

// @TODO: Update the url decoration in https://github.com/TryGhost/Ghost/pull/9969.
const absoluteUrls = (attrs, options) => {
    attrs.url = urlService.getUrlByResourceId(attrs.id, {absolute: true});

    if (attrs.feature_image) {
        attrs.feature_image = urlService.utils.urlFor('image', {image: attrs.feature_image}, true);
    }

    if (attrs.og_image) {
        attrs.og_image = urlService.utils.urlFor('image', {image: attrs.og_image}, true);
    }

    if (attrs.twitter_image) {
        attrs.twitter_image = urlService.utils.urlFor('image', {image: attrs.twitter_image}, true);
    }

    if (attrs.html) {
        attrs.html = urlService.utils.makeAbsoluteUrls(attrs.html, urlService.utils.urlFor('home', true), attrs.url).html();
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
                attrs.tags = attrs.tags.map(tag => urlsForTag(tag));
            }

            if (relation === 'author' && attrs.author) {
                attrs.author = urlsForUser(attrs.author);
            }

            if (relation === 'authors' && attrs.authors) {
                attrs.authors = attrs.authors.map(author => urlsForUser(author));
            }
        });
    }

    return attrs;
};

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                posts: models.data.map(model => absoluteUrls(model.toJSON(frame.options), frame.options)),
                meta: models.meta
            };

            debug(frame.response);
            return;
        }

        frame.response = {
            posts: [absoluteUrls(models.toJSON(frame.options), frame.options)]
        };

        debug(frame.response);
    }
};
