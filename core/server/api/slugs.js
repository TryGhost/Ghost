// # Slug API
// RESTful API for the Slug resource
var Promise = require('bluebird'),
    pipeline = require('../utils/pipeline'),
    apiUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'slugs',
    slugs,
    allowedTypes;

/**
 * ## Slugs API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
slugs = {

    /**
     * ## Generate Slug
     * Create a unique slug for the given type and its name
     *
     * @param {{type (required), name (required), context, transacting}} options
     * @returns {Promise(String)} Unique string
     */
    generate: function (options) {
        var opts = ['type'],
            attrs = ['name'],
            tasks;

        // `allowedTypes` is used to define allowed slug types and map them against its model class counterpart
        allowedTypes = {
            post: models.Post,
            tag: models.Tag,
            user: models.User,
            app: models.App
        };

        /**
         * ### Check allowed types
         * check if options.type contains an allowed type
         * @param {Object} options
         * @returns {Object} options
         */
        function checkAllowedTypes(options) {
            if (allowedTypes[options.type] === undefined) {
                return Promise.reject(new common.errors.BadRequestError({message: common.i18n.t('errors.api.slugs.unknownSlugType', {type: options.type})}));
            }
            return options;
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return models.Base.Model.generateSlug(allowedTypes[options.type], options.data.name, {status: 'all'})
                .then(function onModelResponse(slug) {
                    if (!slug) {
                        return Promise.reject(new common.errors.GhostError({
                            message: common.i18n.t('errors.api.slugs.couldNotGenerateSlug')
                        }));
                    }

                    return {
                        slugs: [{slug: slug}]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {opts: opts, attrs: attrs}),
            apiUtils.handlePermissions(docName, 'generate'),
            checkAllowedTypes,
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = slugs;
