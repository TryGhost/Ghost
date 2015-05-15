// # Base Model
// This is the model from which all other Ghost models extend. The model is based on Bookshelf.Model, and provides
// several basic behaviours such as UUIDs, as well as a set of Data methods for accessing information from the database.
//
// The models are internal to Ghost, only the API and some internal functions such as migration and import/export
// accesses the models directly. All other parts of Ghost, including the blog frontend, admin UI, and apps are only
// allowed to access data via the API.
var _          = require('lodash'),
    bookshelf  = require('bookshelf'),
    config     = require('../config'),
    errors     = require('../errors'),
    filters    = require('../filters'),
    moment     = require('moment'),
    Promise    = require('bluebird'),
    sanitize   = require('validator').sanitize,
    schema     = require('../data/schema'),
    utils      = require('../utils'),
    uuid       = require('node-uuid'),
    validation = require('../data/validation'),

    ghostBookshelf;

// ### ghostBookshelf
// Initializes a new Bookshelf instance called ghostBookshelf, for reference elsewhere in Ghost.
ghostBookshelf = bookshelf(config.database.knex);

// Load the registry plugin, which helps us avoid circular dependencies
ghostBookshelf.plugin('registry');

// ### ghostBookshelf.Model
// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
ghostBookshelf.Model = ghostBookshelf.Model.extend({

    hasTimestamps: true,

    // Get permitted attributes from server/data/schema.js, which is where the DB schema is defined
    permittedAttributes: function () {
        return _.keys(schema.tables[this.tableName]);
    },

    defaults: function () {
        return {
            uuid: uuid.v4()
        };
    },

    initialize: function () {
        var self = this,
            options = arguments[1] || {};

        // make options include available for toJSON()
        if (options.include) {
            this.include = _.clone(options.include);
        }

        this.on('creating', this.creating, this);
        this.on('saving', function (model, attributes, options) {
            return Promise.resolve(self.saving(model, attributes, options)).then(function () {
                return self.validate(model, attributes, options);
            });
        });
    },

    validate: function () {
        return validation.validateSchema(this.tableName, this.toJSON());
    },

    creating: function (newObj, attr, options) {
        if (!this.get('created_by')) {
            this.set('created_by', this.contextUser(options));
        }
    },

    saving: function (newObj, attr, options) {
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
        // Store the previous attributes so we can tell what was updated later
        this._updatedAttributes = newObj.previousAttributes();

        this.set('updated_by', this.contextUser(options));
    },

    // Base prototype properties will go here
    // Fix problems with dates
    fixDates: function (attrs) {
        var self = this;

        _.each(attrs, function (value, key) {
            if (value !== null
                    && schema.tables[self.tableName].hasOwnProperty(key)
                    && schema.tables[self.tableName][key].type === 'dateTime') {
                // convert dateTime value into a native javascript Date object
                attrs[key] = moment(value).toDate();
            }
        });

        return attrs;
    },

    // Convert integers to real booleans
    fixBools: function (attrs) {
        var self = this;
        _.each(attrs, function (value, key) {
            if (schema.tables[self.tableName].hasOwnProperty(key)
                    && schema.tables[self.tableName][key].type === 'bool') {
                attrs[key] = value ? true : false;
            }
        });

        return attrs;
    },

    // Get the user from the options object
    contextUser: function (options) {
        // Default to context user
        if (options.context && options.context.user) {
            return options.context.user;
        // Other wise use the internal override
        } else if (options.context && options.context.internal) {
            return 1;
        } else {
            errors.logAndThrowError(new Error('missing context'));
        }
    },

    // format date before writing to DB, bools work
    format: function (attrs) {
        return this.fixDates(attrs);
    },

    // format data and bool when fetching from DB
    parse: function (attrs) {
        return this.fixBools(this.fixDates(attrs));
    },

    toJSON: function (options) {
        var attrs = _.extend({}, this.attributes),
            self = this;
        options = options || {};
        options = _.pick(options, ['shallow', 'baseKey', 'include', 'context']);

        if (options && options.shallow) {
            return attrs;
        }

        if (options && options.include) {
            this.include = _.union(this.include, options.include);
        }

        _.each(this.relations, function (relation, key) {
            if (key.substring(0, 7) !== '_pivot_') {
                // if include is set, expand to full object
                var fullKey = _.isEmpty(options.baseKey) ? key : options.baseKey + '.' + key;
                if (_.contains(self.include, fullKey)) {
                    attrs[key] = relation.toJSON(_.extend({}, options, {baseKey: fullKey, include: self.include}));
                }
            }
        });

        return attrs;
    },

    sanitize: function (attr) {
        return sanitize(this.get(attr)).xss();
    },

    // Get attributes that have been updated (values before a .save() call)
    updatedAttributes: function () {
        return this._updatedAttributes || {};
    },

    // Get a specific updated attribute value
    updated: function (attr) {
        return this.updatedAttributes()[attr];
    }

}, {
    // ## Data Utility Functions

    /**
     * Returns an array of keys permitted in every method's `options` hash.
     * Can be overridden and added to by a model's `permittedOptions` method.
     * @return {Array} Keys allowed in the `options` hash of every model's method.
     */
    permittedOptions: function () {
        // terms to whitelist for all methods.
        return ['context', 'include', 'transacting'];
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function (data) {
        var permittedAttributes = this.prototype.permittedAttributes(),
            filteredData = _.pick(data, permittedAttributes);

        return filteredData;
    },

    /**
     * Filters potentially unsafe `options` in a model method's arguments, so you can pass them to Bookshelf / Knex.
     * @param {Object} options Represents options to filter in order to be passed to the Bookshelf query.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Object} The filtered results of `options`.
    */
    filterOptions: function (options, methodName) {
        var permittedOptions = this.permittedOptions(methodName),
            filteredOptions = _.pick(options, permittedOptions);

        return filteredOptions;
    },

    // ## Model Data Functions

    /**
     * ### Find All
     * Naive find all fetches all the data for a particular model
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Collection)} Collection of all Models
     */
    findAll:  function (options) {
        options = this.filterOptions(options, 'findAll');
        return ghostBookshelf.Collection.forge([], {model: this}).fetch(options).then(function (result) {
            if (options.include) {
                _.each(result.models, function (item) {
                    item.include = options.include;
                });
            }
            return result;
        });
    },

    /**
     * ### Find One
     * Naive find one where data determines what to match on
     * @param {Object} data
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Model)} Single Model
     */
    findOne: function (data, options) {
        data = this.filterData(data);
        options = this.filterOptions(options, 'findOne');
        // We pass include to forge so that toJSON has access
        return this.forge(data, {include: options.include}).fetch(options);
    },

    /**
     * ### Edit
     * Naive edit
     * @param {Object} data
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Model)} Edited Model
     */
    edit: function (data, options) {
        var id = options.id;
        data = this.filterData(data);
        options = this.filterOptions(options, 'edit');

        return this.forge({id: id}).fetch(options).then(function (object) {
            if (object) {
                return object.save(data, options);
            }
        });
    },

    /**
     * ### Add
     * Naive add
     * @param {Object} data
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Model)} Newly Added Model
     */
    add: function (data, options) {
        data = this.filterData(data);
        options = this.filterOptions(options, 'add');
        var model = this.forge(data);
        // We allow you to disable timestamps when importing posts so that the new posts `updated_at` value is the same
        // as the import json blob. More details refer to https://github.com/TryGhost/Ghost/issues/1696
        if (options.importing) {
            model.hasTimestamps = false;
        }
        return model.save(null, options);
    },

    /**
     * ### Destroy
     * Naive destroy
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Model)} Empty Model
     */
    destroy: function (options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        // Fetch the object before destroying it, so that the changed data is available to events
        return this.forge({id: id}).fetch(options).then(function (obj) {
            return obj.destroy(options);
        });
    },

    /**
    * ### Generate Slug
     * Create a string to act as the permalink for an object.
     * @param {ghostBookshelf.Model} Model Model type to generate a slug for
     * @param {String} base The string for which to generate a slug, usually a title or name
     * @param {Object} options Options to pass to findOne
     * @return {Promise(String)} Resolves to a unique slug string
    */
    generateSlug: function (Model, base, options) {
        var slug,
            slugTryCount = 1,
            baseName = Model.prototype.tableName.replace(/s$/, ''),
            // Look for a matching slug, append an incrementing number if so
            checkIfSlugExists, longSlug;

        checkIfSlugExists = function (slugToFind) {
            var args = {slug: slugToFind};
            // status is needed for posts
            if (options && options.status) {
                args.status = options.status;
            }
            return Model.findOne(args, options).then(function (found) {
                var trimSpace;

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

        slug = utils.safeString(base);

        // Remove trailing hyphen
        slug = slug.charAt(slug.length - 1) === '-' ? slug.substr(0, slug.length - 1) : slug;

        // If it's a user, let's try to cut it down (unless this is a human request)
        if (baseName === 'user' && options && options.shortSlug && slugTryCount === 1 && slug !== 'ghost-owner') {
            longSlug = slug;
            slug = (slug.indexOf('-') > -1) ? slug.substr(0, slug.indexOf('-')) : slug;
        }

        // Check the filtered slug doesn't match any of the reserved keywords
        return filters.doFilter('slug.reservedSlugs', config.slugs.reserved).then(function (slugList) {
            // Some keywords cannot be changed
            slugList = _.union(slugList, config.slugs.protected);

            return _.contains(slugList, slug) ? slug + '-' + baseName : slug;
        }).then(function (slug) {
            // if slug is empty after trimming use the model name
            if (!slug) {
                slug = baseName;
            }
            // Test for duplicate slugs.
            return checkIfSlugExists(slug);
        });
    }

});

// Export ghostBookshelf for use elsewhere
module.exports = ghostBookshelf;
