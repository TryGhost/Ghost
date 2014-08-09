// # Slug API
// RESTful API for the Slug resource
var canThis      = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors       = require('../errors'),
    when         = require('when'),

    slugs,
    // `allowedTypes` is used to define allowed slug types and map them against its model class counterpart
    allowedTypes = {
        post: dataProvider.Post,
        tag: dataProvider.Tag,
        user: dataProvider.User,
        app: dataProvider.App
    };

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
        options = options || {};

        return canThis(options.context).generate.slug().then(function () {
            if (allowedTypes[options.type] === undefined) {
                return when.reject(new errors.BadRequestError('Unknown slug type \'' + options.type + '\'.'));
            }

            return dataProvider.Base.Model.generateSlug(allowedTypes[options.type], options.name, {status: 'all'}).then(function (slug) {
                if (!slug) {
                    return when.reject(new errors.InternalServerError('Could not generate slug.'));
                }

                return { slugs: [{ slug: slug }] };
            });
        }).catch(function (err) {
            if (err) {
                return when.reject(err);
            }

            return when.reject(new errors.NoPermissionError('You do not have permission to generate a slug.'));
        });
    }

};

module.exports = slugs;