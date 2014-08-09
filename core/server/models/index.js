var _      = require('lodash'),
    when   = require('when'),
    models;

models = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Permissions: require('./permission').Permissions,
    Settings: require('./settings').Settings,
    Tag: require('./tag').Tag,
    Base: require('./base'),
    App: require('./app').App,
    AppField: require('./appField').AppField,
    AppSetting: require('./appSetting').AppSetting,
    Client: require('./client').Client,
    Accesstoken: require('./accesstoken').Accesstoken,
    Refreshtoken: require('./refreshtoken').Refreshtoken,

    init: function () {
        return true;
    },
    // ### deleteAllContent
    // Delete all content from the database (posts, tags, tags_posts)
    deleteAllContent: function () {
        var self = this;

        return self.Post.findAll().then(function (posts) {
            return when.all(_.map(posts.toJSON(), function (post) {
                return self.Post.destroy({id: post.id});
            }));
        }).then(function () {
            return self.Tag.findAll().then(function (tags) {
                return when.all(_.map(tags.toJSON(), function (tag) {
                    return self.Tag.destroy({id: tag.id});
                }));
            });
        });
    }
};

module.exports = models;
