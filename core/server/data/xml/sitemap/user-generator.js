var _      = require('lodash'),
    path   = require('path'),
    api    = require('../../../api'),
    config = require('../../../config'),
    validator        = require('validator'),
    BaseMapGenerator = require('./base-generator');

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
    bindEvents: function () {
        var self = this;
        this.dataEvents.on('user.activated', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('user.activated.edited', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('user.deactivated', self.removeUrl.bind(self));
    },

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
        if (datum.cover) {
            // Grab the image url
            imageUrl = this.getUrlForImage(datum.cover);
            imageUrl = imageUrl.substring(0, 2) === '//' ? 'http:' + imageUrl : imageUrl;
            if (validator.isURL(imageUrl, {protocols: ['http', 'https'], require_protocol: true})) {
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
        }

        return orig;
    }
});

module.exports = UserMapGenerator;
