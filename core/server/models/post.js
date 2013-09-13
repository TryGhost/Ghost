var Post,
    Posts,
    _ = require('underscore'),
    uuid = require('node-uuid'),
    when = require('when'),
    errors = require('../errorHandling'),
    Showdown = require('showdown'),
    github = require('../../shared/vendor/showdown/extensions/github'),
    converter = new Showdown.converter({extensions: [github]}),
    User = require('./user').User,
    Tag = require('./tag').Tag,
    GhostBookshelf = require('./base');

Post = GhostBookshelf.Model.extend({

    tableName: 'posts',

    permittedAttributes: [
        'id', 'uuid', 'title', 'slug', 'content_raw', 'content', 'meta_title', 'meta_description', 'meta_keywords',
        'featured', 'image', 'status', 'language', 'author_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
        'published_at', 'published_by'
    ],

    hasTimestamps: true,

    defaults: function () {
        return {
            uuid: uuid.v4(),
            status: 'draft'
            // TODO: language: ghost.config().defaultLang);
        };
    },

    initialize: function () {
        this.on('creating', this.creating, this);
        this.on('saving', this.updateTags, this);
        this.on('saving', this.saving, this);
        this.on('saving', this.validate, this);
    },

    validate: function () {
        GhostBookshelf.validator.check(this.get('title'), "Post title cannot be blank").notEmpty();

        return true;
    },

    saving: function () {
        // Deal with the related data here
        var self = this;

        // Remove any properties which don't belong on the post model
        this.attributes = this.pick(this.permittedAttributes);

        this.set('content', converter.makeHtml(this.get('content_raw')));

        this.set('title', this.get('title').trim());

        if (this.hasChanged('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return this.generateSlug(this.get('slug'))
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }

        if (this.hasChanged('status') && this.get('status') === 'published') {
            this.set('published_at', new Date());
            // This will need to go elsewhere in the API layer.
            this.set('published_by', 1);
        }

        this.set('updated_by', 1);

        // refactoring of ghost required in order to make these details available here

    },

    creating: function () {
        // set any dynamic default properties
        var self = this;
        if (!this.get('created_by')) {
            this.set('created_by', 1);
        }

        if (!this.get('author_id')) {
            this.set('author_id', 1);
        }

        if (!this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return this.generateSlug(this.get('title'))
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    // #### generateSlug
    // Create a string act as the permalink for a post.
    generateSlug: function (title) {
        var slug,
            slugTryCount = 1,
            // Look for a post with a matching slug, append an incrementing number if so
            checkIfSlugExists = function (slugToFind) {
                return Post.read({slug: slugToFind}).then(function (found) {
                    var trimSpace;

                    if (!found) {
                        return when.resolve(slugToFind);
                    }

                    slugTryCount += 1;

                    // If this is the first time through, add the hyphen
                    if (slugTryCount === 2) {
                        slugToFind += '-';
                    } else {
                        // Otherwise, trim the number off the end
                        trimSpace = -(String(slugTryCount - 1).length);
                        slugToFind = slugToFind.slice(0, trimSpace);
                    }

                    slugToFind += slugTryCount;

                    return checkIfSlugExists(slugToFind);
                });
            };

        // Remove URL reserved chars: `:/?#[]@!$&'()*+,;=` as well as `\%<>|^~£"`
        slug = title.trim().replace(/[:\/\?#\[\]@!$&'()*+,;=\\%<>\|\^~£"]/g, '')
        // Replace dots and spaces with a dash
                    .replace(/(\s|\.)/g, '-')
        // Convert 2 or more dashes into a single dash
                    .replace(/-+/g, '-')
        // Make the whole thing lowercase
                    .toLowerCase();

        // Remove trailing hypen
        slug = slug.charAt(slug.length - 1) === '-' ? slug.substr(0, slug.length - 1) : slug;
        // Check the filtered slug doesn't match any of the reserved keywords
        slug = /^(ghost|ghost\-admin|admin|wp\-admin|dashboard|login|archive|archives|category|categories|tag|tags|page|pages|post|posts)$/g
            .test(slug) ? slug + '-post' : slug;

        //if slug is empty after trimming use "post"
        if (!slug) {
            slug = "post";
        }
        // Test for duplicate slugs.
        return checkIfSlugExists(slug);
    },

    updateTags: function (newTags) {
        var self = this,
            tagOperations = [],
            tagsToDetach,
            existingTagIDs,
            tagsToCreateAndAdd,
            tagsToAddByID,
            fetchOperation;

        if (newTags === this) {
            newTags = this.get('tags');
        }

        if (!newTags || !this.id) {
            return;
        }

        fetchOperation = Post.forge({id: this.id}).fetch({withRelated: ['tags']});
        return fetchOperation.then(function (thisModelWithTags) {
            var existingTags = thisModelWithTags.related('tags').models;

            tagsToDetach = existingTags.filter(function (existingTag) {
                var tagStillRemains = newTags.some(function (newTag) {
                    return newTag.id === existingTag.id;
                });

                return !tagStillRemains;
            });
            if (tagsToDetach.length > 0) {
                tagOperations.push(self.tags().detach(tagsToDetach));
            }

            // Detect any tags that have been added by ID
            existingTagIDs = existingTags.map(function (existingTag) {
                return existingTag.id;
            });

            tagsToAddByID = newTags.filter(function (newTag) {
                return existingTagIDs.indexOf(newTag.id) === -1;
            });

            if (tagsToAddByID.length > 0) {
                tagsToAddByID = _.pluck(tagsToAddByID, 'id');
                tagOperations.push(self.tags().attach(tagsToAddByID));
            }

            // Detect any tags that have been added, but don't already exist in the database 
            tagsToCreateAndAdd = newTags.filter(function (newTag) {
                return newTag.id === null || newTag.id === undefined;
            });
            tagsToCreateAndAdd.forEach(function (tagToCreateAndAdd) {
                var createAndAddOperation = Tag.add({name: tagToCreateAndAdd.name}).then(function (createdTag) {
                    return self.tags().attach(createdTag.id);
                });

                tagOperations.push(createAndAddOperation);
            });

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
        options.withRelated = [ "author", "user", "tags" ];
        return GhostBookshelf.Model.findAll.call(this, options);
    },

    // #### findOne
    // Extends base model findOne to eager-fetch author and user relationships.
    findOne: function (args, options) {
        options = options || {};
        options.withRelated = [ "author", "user", "tags" ];
        return GhostBookshelf.Model.findOne.call(this, args, options);
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
        var postCollection;

        // Allow findPage(n)
        if (_.isString(opts) || _.isNumber(opts)) {
            opts = {page: opts};
        }

        opts = _.extend({
            page: 1,
            limit: 15,
            where: {},
            status: 'published',
            orderBy: ['published_at', 'DESC']
        }, opts);

        postCollection = Posts.forge();

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (opts.status !== 'all') {
            opts.where.status = opts.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (opts.where) {
            postCollection.query('where', opts.where);
        }

        opts.withRelated = [ "author", "user", "tags" ];

        // Set the limit & offset for the query, fetching
        // with the opts (to specify any eager relations, etc.)
        // Omitting the `page`, `limit`, `where` just to be sure
        // aren't used for other purposes.
        return postCollection
            .query('limit', opts.limit)
            .query('offset', opts.limit * (opts.page - 1))
            .query('orderBy', opts.orderBy[0], opts.orderBy[1])
            .fetch(_.omit(opts, 'page', 'limit', 'where', 'status', 'orderBy'))
            .then(function (collection) {
                var qb;

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = GhostBookshelf.Knex(_.result(collection, 'tableName'));

                if (opts.where) {
                    qb.where(opts.where);
                }

                return qb.count(_.result(collection, 'idAttribute')).then(function (resp) {
                    var totalPosts = resp[0].aggregate,
                        data = {
                            posts: collection.toJSON(),
                            page: opts.page,
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
                    return data;
                }, errors.logAndThrowError);
            }, errors.logAndThrowError);
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
        return GhostBookshelf.Model.add.call(this, newPostData, options).tap(function (post) {
            // associated models can't be created until the post has an ID, so run this after
            return post.updateTags(newPostData.tags);
        });
    }

});

Posts = GhostBookshelf.Collection.extend({

    model: Post

});

module.exports = {
    Post: Post,
    Posts: Posts
};
