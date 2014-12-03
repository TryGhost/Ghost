var _ = require('lodash'),
    path = require('path'),
    api = require('../../api'),
    BaseMapGenerator = require('./base-generator'),
    config = require('../../config');

// A class responsible for generating a sitemap from posts and keeping it updated
function UserMapGenerator(opts) {
    _.extend(this, _.defaults(opts || {}, UserMapGenerator.Defaults));

    BaseMapGenerator.apply(this, arguments);
}

UserMapGenerator.Defaults = {
    // TODO?
};

// Inherit from the base generator class
_.extend(UserMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(UserMapGenerator.prototype, {
    getData: function () {
        return api.users.browse({
            context: {
                internal: true
            },
            limit: 'all'
        }).then(function (resp) {
            return resp.users;
        });
    },

    getUrlForDatum: function (user, permalinks) {
        return config.urlFor('author', {author: user, permalinks: permalinks}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
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

module.exports = UserMapGenerator;
