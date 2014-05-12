var Tag,
    Tags,
    Posts          = require('./post').Posts,
    ghostBookshelf = require('./base');

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    permittedAttributes: [
        'id', 'uuid', 'name', 'slug', 'description', 'parent_id', 'meta_title', 'meta_description', 'created_at',
        'created_by', 'updated_at', 'updated_by'
    ],

    validate: function () {

        return true;
    },

    creating: function () {
        var self = this;

        ghostBookshelf.Model.prototype.creating.call(this);

        if (!this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return this.generateSlug(Tag, this.get('name'))
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
