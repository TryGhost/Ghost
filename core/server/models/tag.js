var Tag,
    Tags,
    uuid = require('node-uuid'),
    Posts = require('./post').Posts,
    GhostBookshelf = require('./base');

Tag = GhostBookshelf.Model.extend({
    tableName: 'tags',

    hasTimestamps: true,

    defaults: function () {
        return {
            uuid: uuid.v4()
        };
    },

    posts: function () {
        return this.belongsToMany(Posts);
    }
});

Tags = GhostBookshelf.Collection.extend({

    model: Tag

});

module.exports = {
    Tag: Tag,
    Tags: Tags
};
