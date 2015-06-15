// # Post Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    sequence       = require('../utils/sequence'),
    errors         = require('../errors'),
    Showdown       = require('showdown-ghost'),
    converter      = new Showdown.converter({extensions: ['ghostgfm', 'footnotes', 'highlight']}),
    ghostBookshelf = require('./base'),
    events         = require('../events'),
    config         = require('../config'),
    paginateResponse = require('./base/utils').paginateResponse,
    permalinkSetting = '',
    getPermalinkSetting,
    Post,
    Posts;

// Stores model permalink format

getPermalinkSetting = function getPermalinkSetting(model, attributes, options) {
    /*jshint unused:false*/

    // Transactions are used for bulk deletes and imports which don't need this anyway
    if (options.transacting) {
        return Promise.resolve();
    }
    return ghostBookshelf.model('Settings').findOne({key: 'permalinks'}).then(function then(response) {
        if (response) {
            response = response.toJSON(options);
            permalinkSetting = response.hasOwnProperty('value') ? response.value : '';
        }
    });
};

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

    emitChange: function emitChange(event, usePreviousResourceType) {
        var resourceType = this.get('page') ? 'page' : 'post';
        if (usePreviousResourceType) {
            resourceType = this.updated('page') ? 'page' : 'post';
        }
        events.emit(resourceType + '.' + event, this);
    },

    defaults: function defaults() {
        return {
            uuid: uuid.v4(),
            status: 'draft'
        };
    },

    initialize: function initialize() {
        var self = this;

        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('saved', function onSaved(model, response, options) {
            return self.updateTags(model, response, options);
        });

        // Ensures local copy of permalink setting is kept up to date
        this.on('fetching', getPermalinkSetting);

        this.on('created', function onCreated(model) {
            model.emitChange('added');

            if (model.get('status') === 'published') {
                model.emitChange('published');
            }
        });

        this.on('updated', function onUpdated(model) {
            model.statusChanging = model.get('status') !== model.updated('status');
            model.isPublished = model.get('status') === 'published';
            model.wasPublished = model.updated('status') === 'published';
            model.resourceTypeChanging = model.get('page') !== model.updated('page');

            // Handle added and deleted for changing resource
            if (model.resourceTypeChanging) {
                if (model.wasPublished) {
                    model.emitChange('unpublished', true);
                }

                model.emitChange('deleted', true);
                model.emitChange('added');

                if (model.isPublished) {
                    model.emitChange('published');
                }
            } else {
                if (model.statusChanging) {
                    model.emitChange(model.isPublished ? 'published' : 'unpublished');
                } else {
                    if (model.isPublished) {
                        model.emitChange('published.edited');
                    }
                }

                // Fire edited if this wasn't a change between resourceType
                model.emitChange('edited');
            }
        });

        this.on('destroyed', function onDestroyed(model) {
            if (model.previous('status') === 'published') {
                model.emitChange('unpublished');
            }

            model.emitChange('deleted');
        });
    },

    saving: function saving(model, attr, options) {
        var self = this,
            tagsToCheck,
            i;

        options = options || {};
        // keep tags for 'saved' event and deduplicate upper/lowercase tags
        tagsToCheck = this.get('tags');
        this.myTags = [];

        _.each(tagsToCheck, function each(item) {
            for (i = 0; i < self.myTags.length; i = i + 1) {
                if (self.myTags[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                    return;
                }
            }

            self.myTags.push(item);
        });

        ghostBookshelf.Model.prototype.saving.call(this, model, attr, options);

        this.set('html', converter.makeHtml(this.get('markdown')));

        // disabling sanitization until we can implement a better version
        // this.set('title', this.sanitize('title').trim());
        this.set('title', this.get('title').trim());

        if ((this.hasChanged('status') || !this.get('published_at')) && this.get('status') === 'published') {
            if (!this.get('published_at')) {
                this.set('published_at', new Date());
            }

            // unless published_by is set and we're importing, set published_by to contextUser
            if (!(this.get('published_by') && options.importing)) {
                this.set('published_by', this.contextUser(options));
            }
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Post, this.get('slug') || this.get('title'),
                    {status: 'all', transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    creating: function creating(model, attr, options) {
        options = options || {};

        // set any dynamic default properties
        if (!this.get('author_id')) {
            this.set('author_id', this.contextUser(options));
        }

        ghostBookshelf.Model.prototype.creating.call(this, model, attr, options);
    },

    /**
     * ### updateTags
     * Update tags that are attached to a post.  Create any tags that don't already exist.
     * @param {Object} savedModel
     * @param {Object} response
     * @param {Object} options
     * @return {Promise(ghostBookshelf.Models.Post)} Updated Post model
     */
    updateTags: function updateTags(savedModel, response, options) {
        var self = this;
        options = options || {};

        if (!this.myTags) {
            return;
        }

        return Post.forge({id: savedModel.id}).fetch({withRelated: ['tags'], transacting: options.transacting}).then(function then(post) {
            var tagOps = [];

            // remove all existing tags from the post
            // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
            // (https://github.com/tgriesser/bookshelf/issues/294)
            tagOps.push(post.tags().detach(null, _.omit(options, 'query')));

            if (_.isEmpty(self.myTags)) {
                return Promise.all(tagOps);
            }

            return ghostBookshelf.collection('Tags').forge().query('whereIn', 'name', _.pluck(self.myTags, 'name')).fetch(options).then(function then(existingTags) {
                var doNotExist = [],
                    sequenceTasks = [];

                existingTags = existingTags.toJSON(options);

                doNotExist = _.reject(self.myTags, function (tag) {
                    return _.any(existingTags, function (existingTag) {
                        return existingTag.name === tag.name;
                    });
                });

                // Create tags that don't exist and attach to post
                _.each(doNotExist, function (tag) {
                    var createAndAttachOperation = function createAndAttachOperation() {
                        return ghostBookshelf.model('Tag').add({name: tag.name}, options).then(function then(createdTag) {
                            // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                            // (https://github.com/tgriesser/bookshelf/issues/294)
                            return post.tags().attach(createdTag.id, _.omit(options, 'query'));
                        });
                    };

                    sequenceTasks.push(createAndAttachOperation);
                });

                tagOps = tagOps.concat(sequence(sequenceTasks));

                // attach the tags that already existed
                _.each(existingTags, function (tag) {
                    // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                    // (https://github.com/tgriesser/bookshelf/issues/294)
                    tagOps.push(post.tags().attach(tag.id, _.omit(options, 'query')));
                });

                return Promise.all(tagOps);
            });
        });
    },

    // Relations
    author_id: function authorId() {
        return this.belongsTo('User', 'author_id');
    },

    created_by: function createdBy() {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function updatedBy() {
        return this.belongsTo('User', 'updated_by');
    },

    published_by: function publishedBy() {
        return this.belongsTo('User', 'published_by');
    },

    tags: function tags() {
        return this.belongsToMany('Tag');
    },

    fields: function fields() {
        return this.morphMany('AppField', 'relatable');
    },

    toJSON: function toJSON(options) {
        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs.author = attrs.author || attrs.author_id;
        attrs.url = config.urlPathForPost(attrs, permalinkSetting);
        delete attrs.author_id;

        return attrs;
    }
}, {

    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findAll: ['withRelated'],
                findOne: ['importing', 'withRelated'],
                findPage: ['page', 'limit', 'status', 'staticPages', 'featured'],
                add: ['importing']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
        var permittedAttributes = this.prototype.permittedAttributes(),
            filteredData;

        // manually add 'tags' attribute since it's not in the schema
        permittedAttributes.push('tags');

        filteredData = _.pick(data, permittedAttributes);

        return filteredData;
    },

    // ## Model Data Functions

    /**
     * ### Find All
     *
     * @param {Object} options
     * @returns {*}
     */
    findAll:  function findAll(options) {
        options = options || {};

        // fetch relations passed to options.include
        options.withRelated = _.union(options.withRelated, options.include);
        return ghostBookshelf.Model.findAll.call(this, options);
    },

    /**
     * #### findPage
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * **response:**
     *
     *     {
     *         posts: [
     *         {...}, {...}, {...}
     *     ],
     *     page: __,
     *     limit: __,
     *     pages: __,
     *     total: __
     *     }
     *
     * @param {Object} options
     */
    findPage: function findPage(options) {
        options = options || {};

        var tagInstance = options.tag !== undefined ? ghostBookshelf.model('Tag').forge({slug: options.tag}) : false,
            authorInstance = options.author !== undefined ? ghostBookshelf.model('User').forge({slug: options.author}) : false;

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
            staticPages: false, // include static pages
            status: 'published',
            where: {}
        }, options);

        if (options.staticPages !== 'all') {
            // convert string true/false to boolean
            if (!_.isBoolean(options.staticPages)) {
                options.staticPages = options.staticPages === 'true' || options.staticPages === '1' ? true : false;
            }
            options.where.page = options.staticPages;
        }

        if (options.featured) {
            // convert string true/false to boolean
            if (!_.isBoolean(options.featured)) {
                options.featured = options.featured === 'true' || options.featured === '1' ? true : false;
            }
            options.where.featured = options.featured;
        }

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (options.status !== 'all') {
            // make sure that status is valid
            options.status = _.indexOf(['published', 'draft'], options.status) !== -1 ? options.status : 'published';
            options.where.status = options.status;
        }

        // Add related objects
        options.withRelated = _.union(options.withRelated, options.include);

        // If a query param for a tag is attached
        // we need to fetch the tag model to find its id
        function fetchTagQuery() {
            if (tagInstance) {
                return tagInstance.fetch();
            }
            return false;
        }

        function fetchAuthorQuery() {
            if (authorInstance) {
                return authorInstance.fetch();
            }
            return false;
        }

        return Promise.join(fetchTagQuery(), fetchAuthorQuery())
            // Set the limit & offset for the query, fetching
            // with the opts (to specify any eager relations, etc.)
            // Omitting the `page`, `limit`, `where` just to be sure
            // aren't used for other purposes.
            .then(function then() {
                var postCollection = Posts.forge(),
                    collectionPromise,
                    countPromise,
                    qb;

                // If there are where conditionals specified, add those
                // to the query.
                if (options.where) {
                    postCollection.query('where', options.where);
                }
                // If we have a tag instance we need to modify our query.
                // We need to ensure we only select posts that contain
                // the tag given in the query param.
                if (tagInstance) {
                    postCollection
                        .query('join', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                        .query('where', 'posts_tags.tag_id', '=', tagInstance.id);
                }

                if (authorInstance) {
                    postCollection
                        .query('where', 'author_id', '=', authorInstance.id);
                }

                if (_.isNumber(options.limit)) {
                    postCollection
                        .query('limit', options.limit)
                        .query('offset', options.limit * (options.page - 1));
                }

                collectionPromise = postCollection
                    .query('orderBy', 'status', 'ASC')
                    .query('orderBy', 'published_at', 'DESC')
                    .query('orderBy', 'updated_at', 'DESC')
                    .query('orderBy', 'id', 'DESC')
                    .fetch(_.omit(options, 'page', 'limit'));

                // Find the total number of posts

                qb = ghostBookshelf.knex('posts');

                if (options.where) {
                    qb.where(options.where);
                }

                if (tagInstance) {
                    qb.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id');
                    qb.where('posts_tags.tag_id', '=', tagInstance.id);
                }
                if (authorInstance) {
                    qb.where('author_id', '=', authorInstance.id);
                }

                countPromise = qb.count('posts.id as aggregate');

                return Promise.join(collectionPromise, countPromise);
            }).then(function then(results) {
                var postCollection = results[0],
                    data = {};

                data.posts = postCollection.toJSON(options);
                data.meta = {pagination: paginateResponse(results[1][0].aggregate, options)};

                if (tagInstance) {
                    data.meta.filters = {};
                    if (!tagInstance.isNew()) {
                        data.meta.filters.tags = [tagInstance.toJSON(options)];
                    }
                }

                if (authorInstance) {
                    data.meta.filters = {};
                    if (!authorInstance.isNew()) {
                        data.meta.filters.author = authorInstance.toJSON(options);
                    }
                }

                return data;
            })
            .catch(errors.logAndThrowError);
    },

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to handle post status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function findOne(data, options) {
        options = options || {};

        var withNext = _.contains(options.include, 'next'),
            withPrev = _.contains(options.include, 'previous');

        data = _.extend({
            status: 'published'
        }, data || {});

        if (data.status === 'all') {
            delete data.status;
        }

        // Add related objects, excluding next and previous as they are not real db objects
        options.withRelated = _.union(options.withRelated, _.pull([].concat(options.include), 'next', 'previous'));

        return ghostBookshelf.Model.findOne.call(this, data, options).then(function then(post) {
            if ((withNext || withPrev) && post && !post.page) {
                var postData = post.toJSON(options),
                    publishedAt = postData.published_at,
                    prev,
                    next;

                if (withNext) {
                    next = Post.forge().query(function queryBuilder(qb) {
                        qb.where('status', '=', 'published')
                            .andWhere('page', '=', 0)
                            .andWhere('published_at', '>', publishedAt)
                            .orderBy('published_at', 'asc')
                            .limit(1);
                    }).fetch();
                }

                if (withPrev) {
                    prev = Post.forge().query(function queryBuilder(qb) {
                        qb.where('status', '=', 'published')
                            .andWhere('page', '=', 0)
                            .andWhere('published_at', '<', publishedAt)
                            .orderBy('published_at', 'desc')
                            .limit(1);
                    }).fetch();
                }

                return Promise.join(next, prev)
                    .then(function then(nextAndPrev) {
                        if (nextAndPrev[0]) {
                            post.relations.next = nextAndPrev[0];
                        }
                        if (nextAndPrev[1]) {
                            post.relations.previous = nextAndPrev[1];
                        }
                        return post;
                    });
            }

            return post;
        });
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object and manage _updatedAttributes
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function edit(data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.edit.call(this, data, options).then(function then(post) {
            return self.findOne({status: 'all', id: options.id}, options)
                .then(function then(found) {
                    if (found) {
                        // Pass along the updated attributes for checking status changes
                        found._updatedAttributes = post._updatedAttributes;
                        return found;
                    }
                });
        });
    },

    /**
     * ### Add
     * @extends ghostBookshelf.Model.add to handle returning the full object
     * **See:** [ghostBookshelf.Model.add](base.js.html#add)
     */
    add: function add(data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.add.call(this, data, options).then(function then(post) {
            return self.findOne({status: 'all', id: post.id}, options);
        });
    },

    /**
     * ### Destroy
     * @extends ghostBookshelf.Model.destroy to clean up tag relations
     * **See:** [ghostBookshelf.Model.destroy](base.js.html#destroy)
     */
    destroy: function destroy(options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        return this.forge({id: id}).fetch({withRelated: ['tags']}).then(function destroyTags(post) {
            return post.related('tags').detach().then(function destroyPosts() {
                return post.destroy(options);
            });
        });
    },

    /**
     * ### destroyByAuthor
     * @param  {[type]} options has context and id. Context is the user doing the destroy, id is the user to destroy
     */
    destroyByAuthor: function destroyByAuthor(options) {
        var postCollection = Posts.forge(),
            authorId = options.id;

        options = this.filterOptions(options, 'destroyByAuthor');
        if (authorId) {
            return postCollection.query('where', 'author_id', '=', authorId).fetch(options).then(function destroyTags(results) {
                return Promise.map(results.models, function mapper(post) {
                    return post.related('tags').detach(null, options).then(function destroyPosts() {
                        return post.destroy(options);
                    });
                });
            }, function (error) {
                return Promise.reject(new errors.InternalServerError(error.message || error));
            });
        }
        return Promise.reject(new errors.NotFoundError('No user found'));
    },

    permissible: function permissible(postModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            postModel = postModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(postModelOrId) || _.isString(postModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual post model
            return this.findOne({id: postModelOrId, status: 'all'}).then(function then(foundPostModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundPostModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (postModel) {
            // If this is the author of the post, allow it.
            hasUserPermission = hasUserPermission || context.user === postModel.get('author_id');
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject();
    }
});

Posts = ghostBookshelf.Collection.extend({
    model: Post,

    initialize: function initialize() {
        ghostBookshelf.Collection.prototype.initialize.apply(this, arguments);

        // Ensures local copy of permalink setting is kept up to date
        this.on('fetching', getPermalinkSetting);
    }
});

module.exports = {
    Post: ghostBookshelf.model('Post', Post),
    Posts: ghostBookshelf.collection('Posts', Posts)
};
