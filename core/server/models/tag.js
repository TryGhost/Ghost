const ghostBookshelf = require('./base'),
    urlService = require('../services/url'),
    {urlFor} = require('../services/url/utils');
let Tag, Tags;

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    defaults: function defaults() {
        return {
            visibility: 'public'
        };
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'tag' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        model.emitChange('deleted', options);
    },

    onSaving: function onSaving(newTag, attr, options) {
        var self = this;

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // name: #later slug: hash-later
        if (/^#/.test(newTag.get('name'))) {
            this.set('visibility', 'internal');
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Tag, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    emptyStringProperties: function emptyStringProperties() {
        // CASE: the client might send empty image properties with "" instead of setting them to null.
        // This can cause GQL to fail. We therefore enforce 'null' for empty image properties.
        // See https://github.com/TryGhost/GQL/issues/24
        return ['feature_image'];
    },

    posts: function posts() {
        return this.belongsToMany('Post');
    },

    toJSON: function toJSON(unfilteredOptions) {
        var options = Tag.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs.parent = attrs.parent || attrs.parent_id;
        delete attrs.parent_id;

        if (options && options.context && options.context.public && options.absolute_urls) {
            attrs.url = urlFor({
                relativeUrl: urlService.getUrlByResourceId(attrs.id)
            }, true);
            if (attrs.feature_image) {
                attrs.feature_image = urlFor('image', {image: attrs.feature_image}, true);
            }
        }

        return attrs;
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        return options;
    },

    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(methodName),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'absolute_urls'],
                findAll: ['columns'],
                findOne: ['visibility'],
                destroy: ['destroyAll']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    destroy: function destroy(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});
        options.withRelated = ['posts'];

        return this.forge({id: options.id})
            .fetch(options)
            .then(function destroyTagsAndPost(tag) {
                return tag.related('posts')
                    .detach(null, options)
                    .then(function destroyTags() {
                        return tag.destroy(options);
                    });
            });
    }
});

Tags = ghostBookshelf.Collection.extend({
    model: Tag
});

module.exports = {
    Tag: ghostBookshelf.model('Tag', Tag),
    Tags: ghostBookshelf.collection('Tags', Tags)
};
