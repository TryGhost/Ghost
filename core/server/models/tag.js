var Posts          = require('./post').Posts,
    ghostBookshelf = require('./base'),

    Tag,
    Tags;

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    saving: function (newPage, attr, options) {
         /*jshint unused:false*/

        var self = this;

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Tag, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
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
