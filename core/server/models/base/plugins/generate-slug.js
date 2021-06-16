const _ = require('lodash');
const security = require('@tryghost/security');

const urlUtils = require('../../../../shared/url-utils');

/**
 * @type {Bookshelf} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        /**
         * ### Generate Slug
         * Create a string to act as the permalink for an object.
         * @param {Bookshelf['Model']} Model Model type to generate a slug for
         * @param {String} base The string for which to generate a slug, usually a title or name
         * @param {Object} options Options to pass to findOne
         * @return {Promise<String>} Resolves to a unique slug string
         */
        generateSlug: function generateSlug(Model, base, options) {
            let slug;
            let slugTryCount = 1;
            const baseName = Model.prototype.tableName.replace(/s$/, '');

            let longSlug;

            // Look for a matching slug, append an incrementing number if so
            const checkIfSlugExists = function checkIfSlugExists(slugToFind) {
                const args = {slug: slugToFind};

                // status is needed for posts
                if (options && options.status) {
                    args.status = options.status;
                }

                return Model.findOne(args, options).then(function then(found) {
                    let trimSpace;

                    if (!found) {
                        return slugToFind;
                    }

                    slugTryCount += 1;

                    // If we shortened, go back to the full version and try again
                    if (slugTryCount === 2 && longSlug) {
                        slugToFind = longSlug;
                        longSlug = null;
                        slugTryCount = 1;
                        return checkIfSlugExists(slugToFind);
                    }

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

            slug = security.string.safe(base, options);

            // the slug may never be longer than the allowed limit of 191 chars, but should also
            // take the counter into count. We reduce a too long slug to 185 so we're always on the
            // safe side, also in terms of checking for existing slugs already.
            if (slug.length > 185) {
            // CASE: don't cut the slug on import
                if (!_.has(options, 'importing') || !options.importing) {
                    slug = slug.slice(0, 185);
                }
            }

            // If it's a user, let's try to cut it down (unless this is a human request)
            if (baseName === 'user' && options && options.shortSlug && slugTryCount === 1 && slug !== 'ghost-owner') {
                longSlug = slug;
                slug = (slug.indexOf('-') > -1) ? slug.substr(0, slug.indexOf('-')) : slug;
            }

            if (!_.has(options, 'importing') || !options.importing) {
            // This checks if the first character of a tag name is a #. If it is, this
            // is an internal tag, and as such we should add 'hash' to the beginning of the slug
                if (baseName === 'tag' && /^#/.test(base)) {
                    slug = 'hash-' + slug;
                }
            }

            // Some keywords cannot be changed
            slug = _.includes(urlUtils.getProtectedSlugs(), slug) ? slug + '-' + baseName : slug;

            // if slug is empty after trimming use the model name
            if (!slug) {
                slug = baseName;
            }

            // Test for duplicate slugs.
            return checkIfSlugExists(slug);
        }
    });
};

/**
 * @type {import('bookshelf')} Bookshelf
 */
