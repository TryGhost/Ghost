var _              = require('lodash'),
    uuid           = require('node-uuid'),
    when           = require('when'),
    errors         = require('../errorHandling'),
    Showdown       = require('showdown'),
    ghostgfm       = require('../../shared/lib/showdown/extensions/ghostgfm'),
    converter      = new Showdown.converter({extensions: [ghostgfm]}),
    User           = require('./user').User,
    Tag            = require('./tag').Tag,
    Tags           = require('./tag').Tags,
    ghostBookshelf = require('./base'),
    validation     = require('../data/validation'),
    xmlrpc         = require('../xmlrpc'),

    Post,
    Posts;

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

    defaults: function () {
        return {
            uuid: uuid.v4(),
            status: 'draft'
        };
    },

    initialize: function () {
        var self = this;
        this.on('creating', this.creating, this);
        this.on('saved', function (model, attributes, options) {
            if (model.get('status') === 'published') {
                xmlrpc.ping(model.attributes);
            }
            return self.updateTags(model, attributes, options);
        });
        this.on('saving', function (model, attributes, options) {
            return when(self.saving(model, attributes, options)).then(function () {
                return self.validate(model, attributes, options);
            });
        });
    },

    validate: function () {
        validation.validateSchema(this.tableName, this.toJSON());
    },

    saving: function (newPage, attr, options) {
        /*jshint unused:false*/
        var self = this,
            tagsToCheck,
            i;

        // keep tags for 'saved' event and deduplicate upper/lowercase tags
        tagsToCheck = this.get('tags');
        this.myTags = [];
        _.each(tagsToCheck, function (item) {
            for (i = 0; i < self.myTags.length; i = i + 1) {
                if (self.myTags[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                    return;
                }
            }
            self.myTags.push(item);
        });

        ghostBookshelf.Model.prototype.saving.call(this);

        this.set('html', converter.makeHtml(this.get('markdown')));

        // disabling sanitization until we can implement a better version
        //this.set('title', this.sanitize('title').trim());
        this.set('title', this.get('title').trim());

        if ((this.hasChanged('status') || !this.get('published_at')) && this.get('status') === 'published') {
            if (!this.get('published_at')) {
                this.set('published_at', new Date());
            }
            // This will need to go elsewhere in the API layer.
            this.set('published_by', 1);
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Post, this.get('slug') || this.get('title'),
                    {status: 'all', transacting: options.transacting})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }

    },

    creating: function (newPage, attr, options) {
        /*jshint unused:false*/

        // set any dynamic default properties
        if (!this.get('author_id')) {
            this.set('author_id', 1);
        }

        ghostBookshelf.Model.prototype.creating.call(this);
    },

    updateTags: function (newPost, attr, options) {
        /*jshint unused:false*/
        var self = this;
        options = options || {};

        if (!this.myTags) {
            return;
        }

        return Post.forge({id: newPost.id}).fetch({withRelated: ['tags'], transacting: options.transacting}).then(function (thisPostWithTags) {

            var existingTags = thisPostWithTags.related('tags').toJSON(),
                tagOperations = [],
                tagsToDetach = [],
                tagsToAttach = [],
                createdTagsToAttach = [];

            // First find any tags which have been removed
            _.each(existingTags, function (existingTag) {
                if (!_.some(self.myTags, function (newTag) { return newTag.name === existingTag.name; })) {
                    tagsToDetach.push(existingTag.id);
                }
            });

            if (tagsToDetach.length > 0) {
                tagOperations.push(newPost.tags().detach(tagsToDetach, options));
            }

            // Next check if new tags are all exactly the same as what is set on the model
            _.each(self.myTags, function (newTag) {
                if (!_.some(existingTags, function (existingTag) { return newTag.name === existingTag.name; })) {
                    // newTag isn't on this post yet
                    tagsToAttach.push(newTag);
                }
            });

            if (!_.isEmpty(tagsToAttach)) {
                return Tags.forge().query('whereIn', 'name', _.pluck(tagsToAttach, 'name')).fetch(options).then(function (matchingTags) {
                    _.each(matchingTags.toJSON(), function (matchingTag) {
                        tagOperations.push(newPost.tags().attach(matchingTag.id, options));
                        tagsToAttach = _.reject(tagsToAttach, function (tagToAttach) {
                            return tagToAttach.name === matchingTag.name;
                        });

                    });

                    // Return if no tags to add
                    if (tagsToAttach.length === 0) {
                        return;
                    }

                    // Set method to insert, so each tag gets inserted with the appropriate options
                    var opt = options.method;
                    options.method = 'insert';

                    // Create each tag that doesn't yet exist
                    _.each(tagsToAttach, function (tagToCreateAndAttach) {
                        var createAndAttachOperation = Tag.add({name: tagToCreateAndAttach.name}, options).then(function (createdTag) {
                            createdTagsToAttach.push(createdTag);

                            // If the tags are all inserted, process them
                            if (tagsToAttach.length === createdTagsToAttach.length) {

                                // Set method back to whatever it was, for tag attachment
                                options.method = opt;

                                // Attach each newly created tag
                                _.each(createdTagsToAttach, function (tagToAttach) {
                                    newPost.tags().attach(tagToAttach.id, tagToAttach.name, options);
                                });

                            }

                        });

                        tagOperations.push(createAndAttachOperation);

                    });

                    // Return when all tags attached
                    return when.all(tagOperations);

                });
            }

            return when.all(tagOperations);
        });
    },

    // Relations
    user: function () {
        return this.belongsTo(User, 'created_by');
    },

    author: function () {
        return this.belongsTo(User, 'author_id');
    },

    tags: function () {
        return this.belongsToMany(Tag);
    }

}, {

    // #### findAll
    // Extends base model findAll to eager-fetch author and user relationships.
    findAll:  function (options) {
        options = options || {};
        options.withRelated = [ 'author', 'user', 'tags' ];
        return ghostBookshelf.Model.findAll.call(this, options);
    },

    // #### findOne
    // Extends base model findOne to eager-fetch author and user relationships.
    findOne: function (args, options) {
        options = options || {};

        args = _.extend({
            status: 'published'
        }, args || {});

        if (args.status === 'all') {
            delete args.status;
        }

        options.withRelated = [ 'author', 'user', 'tags' ];
        return ghostBookshelf.Model.findOne.call(this, args, options);
    },

     // #### findPage
     // Find results by page - returns an object containing the
     // information about the request (page, limit), along with the
     // info needed for pagination (pages, total).

     // **response:**

     //     {
     //         posts: [
     //         {...}, {...}, {...}
     //     ],
     //     page: __,
     //     limit: __,
     //     pages: __,
     //     total: __
     //     }

    /*
     * @params opts
     */
    findPage: function (opts) {
        var postCollection = Posts.forge(),
            tagInstance = opts.tag !== undefined ? Tag.forge({slug: opts.tag}) : false,
            permittedOptions = ['page', 'limit', 'status', 'staticPages'];

        // sanitize opts so we are not automatically passing through any and all
        // query strings to Bookshelf / Knex. Although the API requires auth, we
        // should prevent this until such time as we can design the API properly and safely.
        opts = _.pick(opts, permittedOptions);

        // Set default settings for options
        opts = _.extend({
            page: 1, // pagination page
            limit: 15,
            staticPages: false, // include static pages
            status: 'published',
            where: {}
        }, opts);

        if (opts.staticPages !== 'all') {
            // convert string true/false to boolean
            if (!_.isBoolean(opts.staticPages)) {
                opts.staticPages = opts.staticPages === 'true' || opts.staticPages === '1' ? true : false;
            }
            opts.where.page = opts.staticPages;
        }

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (opts.status !== 'all') {
            // make sure that status is valid
            opts.status = _.indexOf(['published', 'draft'], opts.status) !== -1 ? opts.status : 'published';
            opts.where.status = opts.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (opts.where) {
            postCollection.query('where', opts.where);
        }

        // Fetch related models
        opts.withRelated = [ 'author', 'user', 'tags' ];

        // If a query param for a tag is attached
        // we need to fetch the tag model to find its id
        function fetchTagQuery() {
            if (tagInstance) {
                return tagInstance.fetch();
            }
            return false;
        }

        return when(fetchTagQuery())

            // Set the limit & offset for the query, fetching
            // with the opts (to specify any eager relations, etc.)
            // Omitting the `page`, `limit`, `where` just to be sure
            // aren't used for other purposes.
            .then(function () {
                // If we have a tag instance we need to modify our query.
                // We need to ensure we only select posts that contain
                // the tag given in the query param.
                if (tagInstance) {
                    postCollection
                        .query('join', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                        .query('where', 'posts_tags.tag_id', '=', tagInstance.id);
                }

                return postCollection
                    .query('limit', opts.limit)
                    .query('offset', opts.limit * (opts.page - 1))
                    .query('orderBy', 'status', 'ASC')
                    .query('orderBy', 'published_at', 'DESC')
                    .query('orderBy', 'updated_at', 'DESC')
                    .fetch(_.omit(opts, 'page', 'limit'));
            })

            // Fetch pagination information
            .then(function () {
                var qb,
                    tableName = _.result(postCollection, 'tableName'),
                    idAttribute = _.result(postCollection, 'idAttribute');

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = ghostBookshelf.knex(tableName);

                if (opts.where) {
                    qb.where(opts.where);
                }

                if (tagInstance) {
                    qb.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id');
                    qb.where('posts_tags.tag_id', '=', tagInstance.id);
                }

                return qb.count(tableName + '.' + idAttribute + ' as aggregate');
            })

            // Format response of data
            .then(function (resp) {
                var totalPosts = parseInt(resp[0].aggregate, 10),
                    data = {
                        posts: postCollection.toJSON(),
                        page: parseInt(opts.page, 10),
                        limit: opts.limit,
                        pages: Math.ceil(totalPosts / opts.limit),
                        total: totalPosts
                    };

                if (data.pages > 1) {
                    if (data.page === 1) {
                        data.next = data.page + 1;
                    } else if (data.page === data.pages) {
                        data.prev = data.page - 1;
                    } else {
                        data.next = data.page + 1;
                        data.prev = data.page - 1;
                    }
                }

                if (tagInstance) {
                    data.aspect = {
                        tag: tagInstance.toJSON()
                    };
                }

                return data;
            })
            .catch(errors.logAndThrowError);
    },

    permissable: function (postModelOrId, userId, action_type, userPermissions) {
        var self = this,
            hasPermission,
            postModel = postModelOrId;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(postModelOrId) || _.isString(postModelOrId)) {
            return this.read({id: postModelOrId}).then(function (foundPostModel) {
                return self.permissable(foundPostModel, userId, action_type, userPermissions);
            }, errors.logAndThrowError);
        }

        // Check if any permissions apply for this user and post.
        hasPermission = _.any(userPermissions, function (perm) {
            // Check for matching action type and object type
            if (perm.get('action_type') !== action_type ||
                    perm.get('object_type') !== 'post') {
                return false;
            }

            // If asking whether we can create posts,
            // and we have a create posts permission then go ahead and say yes
            if (action_type === 'create' && perm.get('action_type') === action_type) {
                return true;
            }

            // Check for either no object id or a matching one
            return !perm.get('object_id') || perm.get('object_id') === postModel.id;
        });

        // If this is the author of the post, allow it.
        // Moved below the permissions checks because there may not be a postModel
        // in the case like canThis(user).create.post()
        hasPermission = hasPermission || (postModel && userId === postModel.get('author_id'));

        // Resolve if we have appropriate permissions
        if (hasPermission) {
            return when.resolve();
        }

        // Otherwise, you shall not pass.
        return when.reject();
    },
    add: function (newPostData, options) {
        var self = this;

        return ghostBookshelf.Model.add.call(this, newPostData, options).then(function (post) {
            return self.findOne({status: 'all', id: post.id}, options);
        });
    },
    edit: function (editedPost, options) {
        var self = this;

        return ghostBookshelf.Model.edit.call(this, editedPost, options).then(function (post) {
            return self.findOne({status: 'all', id: post.id}, options);
        });
    },
    destroy: function (_identifier, options) {
        options = options || {};
        return this.forge({id: _identifier}).fetch({withRelated: ['tags']}).then(function destroyTags(post) {
            var tagIds = _.pluck(post.related('tags').toJSON(), 'id');
            if (tagIds) {
                return post.tags().detach(tagIds).then(function destroyPost() {
                    return post.destroy(options);
                });
            }

            return post.destroy(options);
        });
    }
});

Posts = ghostBookshelf.Collection.extend({

    model: Post

});

module.exports = {
    Post: Post,
    Posts: Posts
};
