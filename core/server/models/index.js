var migrations = require('../data/migration'),
    _          = require('lodash'),
    when   = require('when');

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
    // ### deleteAllContent
    // Delete all content from the database (posts, tags, tags_posts)
    deleteAllContent: function () {
        var self = this;

        return self.Post.browse().then(function (posts) {
            return when.all(_.map(posts.toJSON(), function (post) {
                return self.Post.destroy(post.id);
            }));
        }).then(function () {
            return self.Tag.browse().then(function (tags) {
                return when.all(_.map(tags.toJSON(), function (tag) {
                    return self.Tag.destroy(tag.id);
                }));
            });
        });
    }
};
