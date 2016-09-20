// # Posts API
// RESTful API for the Post resource
var Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    errors          = require('../errors'),
    utils           = require('./utils'),
    pipeline        = require('../utils/pipeline'),
    i18n            = require('../i18n'),

    docName         = 'posts',
    allowedIncludes = [
        'created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields',
        'next', 'previous', 'next.author', 'next.tags', 'previous.author', 'previous.tags'
    ],
    posts;

/**
 * ### Posts API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */

posts = {
    /**
     * ## Browse
     * Find a paginated set of posts
     *
     * Will only return published posts unless we have an authenticated user and an alternative status
     * parameter.
     *
     * Will return without static pages unless told otherwise
     *
     *
     * @public
     * @param {{context, page, limit, status, staticPages, tag, featured}} options (optional)
     * @returns {Promise<Posts>} Posts Collection with Meta
     */
    browse: function browse(options) {
        var extraOptions = ['status'],
            permittedOptions,
            tasks;

        // Workaround to remove static pages from results
        // TODO: rework after https://github.com/TryGhost/Ghost/issues/5151
        if (options && options.context && (options.context.user || options.context.internal)) {
            extraOptions.push('staticPages');
        }
        permittedOptions = utils.browseDefaultOptions.concat(extraOptions);

        /**
         * ### Model Query
         *  Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Post.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: permittedOptions}),
            utils.handlePublicPermissions(docName, 'browse'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * Find a post, by ID, UUID, or Slug
     *
     * @public
     * @param {Object} options
     * @return {Promise<Post>} Post
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'status', 'uuid'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Post.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {attrs: attrs}),
            utils.handlePublicPermissions(docName, 'read'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            // @TODO make this a formatResponse task?
            if (result) {
                return {posts: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.posts.postNotFound')));
        });
    },

    /**
     * ## Edit
     * Update properties of a post
     *
     * @public
     * @param {Post} object Post or specific properties to update
     * @param {{id (required), context, include,...}} options
     * @return {Promise(Post)} Edited Post
     */
    edit: function edit(object, options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Post.edit(options.data.posts[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            utils.handlePermissions(docName, 'edit'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                var post = result.toJSON(options);

                // If previously was not published and now is (or vice versa), signal the change
                post.statusChanged = false;
                if (result.updated('status') !== result.get('status')) {
                    post.statusChanged = true;
                }
                return {posts: [post]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.posts.postNotFound')));
        });
    },

    /**
     * ## Add
     * Create a new post along with any tags
     *
     * @public
     * @param {Post} object
     * @param {{context, include,...}} options
     * @return {Promise(Post)} Created Post
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Post.add(options.data.posts[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName),
            utils.handlePermissions(docName, 'add'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            var post = result.toJSON(options);

            if (post.status === 'published') {
                // When creating a new post that is published right now, signal the change
                post.statusChanged = true;
            }
            return {posts: [post]};
        });
    },

    /**
     * ## Destroy
     * Delete a post, cleans up tag relations, but not unused tags
     *
     * @public
     * @param {{id (required), context,...}} options
     * @return {Promise}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * @function deletePost
         * @param  {Object} options
         */
        function deletePost(options) {
            var Post = dataProvider.Post,
                data = _.defaults({status: 'all'}, options),
                fetchOpts = _.defaults({require: true, columns: 'id'}, options);

            return Post.findOne(data, fetchOpts).then(function () {
                return Post.destroy(options).return(null);
            }).catch(Post.NotFoundError, function () {
                throw new errors.NotFoundError(i18n.t('errors.api.posts.postNotFound'));
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            utils.handlePermissions(docName, 'destroy'),
            utils.convertOptions(allowedIncludes),
            deletePost
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = posts;
