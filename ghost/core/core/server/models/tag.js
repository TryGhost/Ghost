const ghostBookshelf = require('./base');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const urlUtils = require('../../shared/url-utils');

const messages = {
    tagNotFound: 'Tag not found.'
};

let Tag;
let Tags;

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    actionsCollectCRUD: true,
    actionsResourceType: 'tag',

    defaults: function defaults() {
        return {
            visibility: 'public'
        };
    },

    formatOnWrite(attrs) {
        const urlTransformMap = {
            feature_image: 'toTransformReady',
            og_image: 'toTransformReady',
            twitter_image: 'toTransformReady',
            codeinjection_head: 'htmlToTransformReady',
            codeinjection_foot: 'htmlToTransformReady',
            canonical_url: {
                method: 'toTransformReady',
                options: {
                    ignoreProtocol: false
                }
            }
        };

        Object.entries(urlTransformMap).forEach(([attr, transform]) => {
            let method = transform;
            let transformOptions = {};

            if (typeof transform === 'object') {
                method = transform.method;
                transformOptions = transform.options || {};
            }

            if (attrs[attr]) {
                attrs[attr] = urlUtils[method](attrs[attr], transformOptions);
            }
        });

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform URLs from __GHOST_URL__ to absolute
        [
            'feature_image',
            'og_image',
            'twitter_image',
            'codeinjection_head',
            'codeinjection_foot',
            'canonical_url'
        ].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'tag' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    },

    onSaving: function onSaving(newTag, attr, options) {
        const self = this;

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // Support tag creation with `posts: [{..., tags: [{slug: 'new'}]}]`
        // In that situation we have a slug but no name so validation will fail
        // unless we set one automatically. Re-using slug for name matches our
        // opposite name->slug behavior.
        if (!newTag.get('name') && newTag.get('slug')) {
            this.set('name', newTag.get('slug'));
        }

        // name: #later slug: hash-later
        if (/^#/.test(newTag.get('name'))) {
            this.set('visibility', 'internal');
        }

        if (this.hasChanged('slug') || (!this.get('slug') && this.get('name'))) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Tag, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    posts: function posts() {
        return this.belongsToMany('Post');
    },

    toJSON: function toJSON(unfilteredOptions) {
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);

        // @NOTE: this serialization should be moved into api layer, it's not being moved as it's not used
        attrs.parent = attrs.parent || attrs.parent_id;
        delete attrs.parent_id;

        return attrs;
    },

    defaultColumnsToFetch() {
        return ['id'];
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        // allowlists for the `options` hash argument on methods, by method name.
        // these are the only options that can be passed to Bookshelf / Knex.
        const validOptions = {
            findAll: ['columns'],
            findOne: ['columns', 'visibility'],
            destroy: ['destroyAll']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    countRelations() {
        return {
            posts(modelOrCollection, options) {
                modelOrCollection.query('columns', 'tags.*', (qb) => {
                    qb.count('posts.id')
                        .from('posts')
                        .leftOuterJoin('posts_tags', 'posts.id', 'posts_tags.post_id')
                        .whereRaw('posts_tags.tag_id = tags.id')
                        .as('count__posts');

                    if (options.context && options.context.public) {
                        // @TODO use the filter behavior for posts
                        qb.andWhere('posts.type', '=', 'post');
                        qb.andWhere('posts.status', '=', 'published');
                    }
                });
            }
        };
    },

    destroy: function destroy(unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});
        options.withRelated = ['posts'];

        return this.forge({id: options.id})
            .fetch(options)
            .then(function destroyTagsAndPost(tag) {
                if (!tag) {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.tagNotFound)
                    }));
                }

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
