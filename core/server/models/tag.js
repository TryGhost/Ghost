var Posts          = require('./post').Posts,
    ghostBookshelf = require('./base'),

    Tag,
    Tags;

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    saving: function () {
        var self = this;
        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (!this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return ghostBookshelf.Model.generateSlug(Tag, this.get('name'))
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    posts: function () {
        return this.belongsToMany(Posts);
    }
});

Tags = ghostBookshelf.Collection.extend({

    model: Tag

});

module.exports = {
    Tag: Tag,
    Tags: Tags
};
