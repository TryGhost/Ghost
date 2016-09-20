// # Slug API
// RESTful API for the Slug resource
var dataProvider = require('../models'),
    errors       = require('../errors'),
    Promise      = require('bluebird'),
    pipeline     = require('../utils/pipeline'),
    utils        = require('./utils'),
    i18n         = require('../i18n'),
    docName      = 'slugs',

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
            post: dataProvider.Post,
            tag: dataProvider.Tag,
            user: dataProvider.User,
            app: dataProvider.App
        };

        /**
         * ### Check allowed types
         * check if options.type contains an allowed type
         * @param {Object} options
         * @returns {Object} options
         */
        function checkAllowedTypes(options) {
            if (allowedTypes[options.type] === undefined) {
                return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.slugs.unknownSlugType', {type: options.type})));
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
            return dataProvider.Base.Model.generateSlug(allowedTypes[options.type], options.data.name, {status: 'all'});
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: opts, attrs: attrs}),
            utils.handlePermissions(docName, 'generate'),
            checkAllowedTypes,
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function (slug) {
            if (!slug) {
                return Promise.reject(new errors.InternalServerError(i18n.t('errors.api.slugs.couldNotGenerateSlug')));
            }

            return {slugs: [{slug: slug}]};
        });
    }
};

module.exports = slugs;
