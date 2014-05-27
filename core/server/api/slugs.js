var canThis      = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors       = require('../errors'),
    when         = require('when'),

    slugs,
    // `allowedTypes` is used to define allowed slug types and map them against it's model class counterpart
    allowedTypes = {
        post: dataProvider.Post,
        tag: dataProvider.Tag
    };

/**
 * ## Generate Slug
 * Create a unique slug for a given post title
 * @param {{type (required), context}} options
 * @param {{title (required), transacting}} options
 * @returns {Promise(String)} Unique string
 */
slugs = {

    // #### Generate slug
    // **takes:** a string to generate the slug from
    generate: function (options) {
        options = options || {};

        return canThis(options.context).generate.slug().then(function () {
            if (allowedTypes[options.type] === undefined) {
                return when.reject(new errors.BadRequestError('Unknown slug type \'' + options.type + '\'.'));
            }

            return dataProvider.Base.Model.generateSlug(allowedTypes[options.type], options.title, {status: 'all'}).then(function (slug) {
                if (!slug) {
                    return when.reject(new errors.InternalServerError('Could not generate slug.'));
                }

                return { slugs: [{ slug: slug }] };
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to generate a slug.'));
        });
    }

};

module.exports = slugs;