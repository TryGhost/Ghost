// # Posts API
// RESTful API for the Post resource
const Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'posts',
    /**
     * @deprecated: `author`, will be removed in Ghost 3.0
     */
    allowedIncludes = [
        'created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields', 'authors', 'authors.roles'
    ],
    unsafeAttrs = ['author_id', 'status', 'authors'];

let posts;

/**
 * ### Posts API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
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
        var extraOptions = ['status', 'formats', 'absolute_urls'],
            permittedOptions,
            tasks;

        // Workaround to remove static pages from results
        // TODO: rework after https://github.com/TryGhost/Ghost/issues/5151
        if (options && options.context && (options.context.user || options.context.internal)) {
            extraOptions.push('staticPages');
        }
        permittedOptions = localUtils.browseDefaultOptions.concat(extraOptions);

        /**
         * ### Model Query
         *  Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return models.Post.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: permittedOptions}),
            localUtils.convertOptions(allowedIncludes, models.Post.allowedFormats),
            localUtils.handlePublicPermissions(docName, 'browse', unsafeAttrs),
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
            // NOTE: the scheduler API uses the post API and forwards custom options
            extraAllowedOptions = options.opts || ['formats', 'absolute_urls'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return models.Post.findOne(options.data, _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        }));
                    }

                    return {
                        posts: [model.toJSON(options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {attrs: attrs, opts: extraAllowedOptions}),
            localUtils.convertOptions(allowedIncludes, models.Post.allowedFormats),
            localUtils.handlePublicPermissions(docName, 'read', unsafeAttrs),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
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
        var tasks,
            // NOTE: the scheduler API uses the post API and forwards custom options
            extraAllowedOptions = options.opts || [];

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return models.Post.edit(options.data.posts[0], _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        }));
                    }

                    var post = model.toJSON(options);

                    // If previously was not published and now is (or vice versa), signal the change
                    // @TODO: `statusChanged` get's added for the API headers only. Reconsider this.
                    post.statusChanged = false;
                    if (model.updated('status') !== model.get('status')) {
                        post.statusChanged = true;
                    }

                    return {
                        posts: [post]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions.concat(extraAllowedOptions)}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePermissions(docName, 'edit', unsafeAttrs),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
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
            return models.Post.add(options.data.posts[0], _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    var post = model.toJSON(options);

                    if (post.status === 'published') {
                        // When creating a new post that is published right now, signal the change
                        post.statusChanged = true;
                    }

                    return {posts: [post]};
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePermissions(docName, 'add', unsafeAttrs),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
    },

    /**
     * ## Destroy
     * Delete a post, cleans up tag relations, but not unused tags.
     * You can only delete a post by `id`.
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
            const opts = _.defaults({require: true}, options);

            return models.Post.destroy(opts).return(null)
                .catch(models.Post.NotFoundError, function () {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.posts.postNotFound')
                    });
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePermissions(docName, 'destroy', unsafeAttrs),
            deletePost
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = posts;
