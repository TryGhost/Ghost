// # Slug API
// RESTful API for the Slug resource
var canThis      = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors       = require('../errors'),
    Promise      = require('bluebird'),
    pipeline     = require('../utils/pipeline'),
    utils        = require('./utils'),
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
        var tasks;

        // `allowedTypes` is used to define allowed slug types and map them against its model class counterpart
        allowedTypes = {
            post: dataProvider.Post,
            tag: dataProvider.Tag,
            user: dataProvider.User,
            app: dataProvider.App
        };

        /**
         * ### Handle Permissions
         * We need to be an authorized user and use an allowedType
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).generate.slug().then(function () {
                if (allowedTypes[options.type] === undefined) {
                    return Promise.reject(new errors.BadRequestError('Unknown slug type \'' + options.type + '\'.'));
                }
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to generate a slug.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Base.Model.generateSlug(allowedTypes[options.type], options.name, {status: 'all'});
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName), handlePermissions, modelQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function (slug) {
            if (!slug) {
                return Promise.reject(new errors.InternalServerError('Could not generate slug.'));
            }

            return {slugs: [{slug: slug}]};
        });
    }
};

module.exports = slugs;
