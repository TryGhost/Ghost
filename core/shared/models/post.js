var Post,
    Posts,
    _ = require('underscore'),
    uuid = require('node-uuid'),
    when = require('when'),
    errors = require('../errorHandling'),
    Showdown = require('showdown'),
    converter = new Showdown.converter(),
    User = require('./user').User,
    GhostBookshelf = require('./base');

Post = GhostBookshelf.Model.extend({

    tableName: 'posts',

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
        this.on('saving', this.saving, this);
    },

    saving: function () {
        if (!this.get('title')) {
            throw new Error('Post title cannot be blank');
        }
        this.set('content_html', converter.makeHtml(this.get('content')));

        if (this.hasChanged('status') && this.get('status') === 'published') {
            this.set('published_at', new Date());
            // This will need to go elsewhere in the API layer.
            this.set('published_by', 1);
        }

        this.set('updated_by', 1);
        // refactoring of ghost required in order to make these details available here
    },

    creating: function () {
        if (!this.get('slug')) {
            this.generateSlug();
        }

        if (!this.get('created_by')) {
            this.set('created_by', 1);
        }

        if (!this.get('author_id')) {
            this.set('author_id', 1);
        }
    },

    // #### generateSlug
    // Create a string act as the permalink for a post.
    // Remove reserved chars: `:/?#[]@!$&'()*+,;=` as well as `\` and convert spaces to hyphens
    generateSlug: function () {
        return this.set('slug', this.get('title').replace(/[:\/\?#\[\]@!$&'()*+,;=\\]/g, '').replace(/\s/g, '-').toLowerCase());
    },

    user: function () {
        return this.belongsTo(User, 'created_by');
    },

    author: function () {
        return this.belongsTo(User, 'author_id');
    }

}, {

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

        // TODO: This logic is temporary, will probably need to be updated

        hasPermission = _.any(userPermissions, function (perm) {
            if (perm.get('object_type') !== 'post') {
                return false;
            }

            // True, if no object_id specified, or it matches
            return !perm.get('object_id') || perm.get('object_id') === postModel.id;
        });

        // If this is the author of the post, allow it.
        hasPermission = hasPermission || userId === postModel.get('author_id');

        if (hasPermission) {
            return when.resolve();
        }

        // Otherwise, you shall not pass.
        return when.reject();
    }

});

Posts = GhostBookshelf.Collection.extend({

    model: Post

});

module.exports = {
    Post: Post,
    Posts: Posts
};