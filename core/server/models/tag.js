var _              = require('lodash'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    ghostBookshelf = require('./base'),
    sitemap        = require('../data/sitemap'),

    Tag,
    Tags;

function addPostCount(options, obj) {
    if (options.include && options.include.indexOf('post_count') > -1) {
        obj.query('select', 'tags.*');
        obj.query('count', 'posts_tags.id as post_count');
        obj.query('leftJoin', 'posts_tags', 'tag_id', 'tags.id');
        obj.query('groupBy', 'tag_id', 'tags.id');

        options.include = _.pull([].concat(options.include), 'post_count');
    }
}

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    initialize: function () {
        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('created', function (model) {
            sitemap.tagAdded(model);
        });
        this.on('updated', function (model) {
            sitemap.tagEdited(model);
        });
        this.on('destroyed', function (model) {
            sitemap.tagDeleted(model);
        });
    },

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
        return this.belongsToMany('Post');
    },

    toJSON: function (options) {
        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs.parent = attrs.parent || attrs.parent_id;
        delete attrs.parent_id;

        return attrs;
    }
}, {
    permittedOptions: function (methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findPage: ['page', 'limit']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * ### Find One
     * @overrides ghostBookshelf.Model.findOne
     */
    findOne: function (data, options) {
        options = options || {};

        options = this.filterOptions(options, 'findOne');
        data = this.filterData(data, 'findOne');

        var tag = this.forge(data);

        addPostCount(options, tag);

        // Add related objects
        options.withRelated = _.union(options.withRelated, options.include);

        return tag.fetch(options);
    },

    findPage: function (options) {
        options = options || {};

        var tagCollection = Tags.forge(),
            collectionPromise,
            qb;

        if (options.limit && options.limit !== 'all') {
            options.limit = parseInt(options.limit, 10) || 15;
        }

        if (options.page) {
            options.page = parseInt(options.page, 10) || 1;
        }

        options = this.filterOptions(options, 'findPage');
        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            where: {}
        }, options);

        // only include a limit-query if a numeric limit is provided
        if (_.isNumber(options.limit)) {
            tagCollection
                .query('limit', options.limit)
                .query('offset', options.limit * (options.page - 1));
        }

        addPostCount(options, tagCollection);

        collectionPromise = tagCollection.fetch(_.omit(options, 'page', 'limit'));

        // Find total number of tags

        qb = ghostBookshelf.knex('tags');

        if (options.where) {
            qb.where(options.where);
        }

        return Promise.join(collectionPromise, qb.count('tags.id as aggregate')).then(function (results) {
            var totalTags = results[1][0].aggregate,
                calcPages = Math.ceil(totalTags / options.limit) || 0,
                tagCollection = results[0],
                pagination = {},
                meta = {},
                data = {};

            pagination.page = options.page;
            pagination.limit = options.limit;
            pagination.pages = calcPages === 0 ? 1 : calcPages;
            pagination.total = totalTags;
            pagination.next = null;
            pagination.prev = null;

            data.tags = tagCollection.toJSON();
            data.meta = meta;
            meta.pagination = pagination;

            if (pagination.pages > 1) {
                if (pagination.page === 1) {
                    pagination.next = pagination.page + 1;
                } else if (pagination.page === pagination.pages) {
                    pagination.prev = pagination.page - 1;
                } else {
                    pagination.next = pagination.page + 1;
                    pagination.prev = pagination.page - 1;
                }
            }

            return data;
        })
        .catch(errors.logAndThrowError);
    },
    destroy: function (options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        return this.forge({id: id}).fetch({withRelated: ['posts']}).then(function destroyTagsAndPost(tag) {
            return tag.related('posts').detach().then(function () {
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
