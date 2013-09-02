var Tag,
    Tags,
    Posts = require('./post').Posts,
    GhostBookshelf = require('./base');

Tag = GhostBookshelf.Model.extend({
    tableName: 'tags',

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
