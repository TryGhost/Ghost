var migrations = require('../data/migration'),
    _          = require('underscore');

module.exports = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Settings: require('./settings').Settings,
    Tag: require('./tag').Tag,
    Base: require('./base'),
    Session: require('./session').Session,

    init: function () {
        return migrations.init();
    },
    reset: function () {
        return migrations.reset().then(function () {
            return migrations.init();
        });
    },
    // ### deleteAllContent
    // Delete all content from the database (posts, tags, tags_posts)
    deleteAllContent: function () {
        var self = this;

        return self.Post.browse().then(function (posts) {
            _.each(posts.toJSON(), function (post) {
                self.Post.destroy(post.id);
            });
        }).then(function () {
            self.Tag.browse().then(function (tags) {
                _.each(tags.toJSON(), function (tag) {
                    self.Tag.destroy(tag.id);
                });
            });
        });
    }
};
