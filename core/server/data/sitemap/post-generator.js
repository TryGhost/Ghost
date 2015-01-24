var _ = require('lodash'),
    path = require('path'),
    api = require('../../api'),
    BaseMapGenerator = require('./base-generator'),
    config = require('../../config');

// A class responsible for generating a sitemap from posts and keeping it updated
function PostMapGenerator(opts) {
    _.extend(this, _.defaults(opts || {}, PostMapGenerator.Defaults));

    BaseMapGenerator.apply(this, arguments);
}

PostMapGenerator.Defaults = {
    // TODO?
};

// Inherit from the base generator class
_.extend(PostMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(PostMapGenerator.prototype, {
    getData: function () {
        return api.posts.browse({
            context: {
                internal: true
            },
            status: 'published',
            staticPages: false,
            limit: 'all'
        }).then(function (resp) {
            return resp.posts;
        });
    },

    getUrlForDatum: function (post, permalinks) {
        return config.urlFor('post', {post: post, permalinks: permalinks}, true);
    },

    getPriorityForDatum: function (post) {
        // give a slightly higher priority to featured posts
        return post.featured ? 0.9 : 0.8;
    },

    createUrlNodeFromDatum: function (datum) {
        var orig = BaseMapGenerator.prototype.createUrlNodeFromDatum.apply(this, arguments),
            imageUrl,
            imageEl;

        // Check for image and add it
        if (datum.image) {
            // Grab the image url
            imageUrl = this.getUrlForImage(datum.image);
            // Create the weird xml node syntax structure that is expected
            imageEl = [
                {'image:loc': imageUrl},
                {'image:caption': path.basename(imageUrl)}
            ];
            // Add the node to the url xml node
            orig.url.push({
                'image:image': imageEl
            });
        }

        return orig;
    }
});

module.exports = PostMapGenerator;
