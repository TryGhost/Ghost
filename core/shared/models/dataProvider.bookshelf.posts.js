(function () {
    "use strict";

    var _ = require('underscore'),
        util = require('util'),
        models = require('./models'),
        Bookshelf = require('bookshelf'),
        BaseProvider = require('./dataProvider.bookshelf.base'),
        PostsProvider;

    /**
     * The Posts data provider implementation for Bookshelf.
     */
    PostsProvider = function () {
        BaseProvider.call(this, models.Post, models.Posts);
    };

    util.inherits(PostsProvider, BaseProvider);

    /**
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * {
     *   posts: [
     *    {...}, {...}, {...}
     *   ],
     *   page: __,
     *   limit: __,
     *   pages: __,
     *   total: __
     * }
     *
     * @params opts
     */
    PostsProvider.prototype.findPage = function (opts) {
        var postCollection;

        // Allow findPage(n)
        if (!_.isObject(opts)) {
            opts = {page: opts};
        }

        opts = _.defaults(opts || {}, {
            page: 1,
            limit: 15,
            where: null
        });
        postCollection = this.collection.forge();

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
            .fetch(_.omit(opts, 'page', 'limit', 'where'))
            .then(function (collection) {
                var qb;

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = Bookshelf.Knex(_.result(collection, 'tableName'));

                if (opts.where) {
                    qb.where(opts.where);
                }

                return qb.count(_.result(collection, 'idAttribute')).then(function (resp) {
                    var totalPosts = resp[0].aggregate;
                    return {
                        posts: collection.toJSON(),
                        page: opts.page,
                        limit: opts.limit,
                        pages: Math.ceil(totalPosts / opts.limit),
                        total: totalPosts
                    };
                });
            });
    };

    module.exports = PostsProvider;
}());