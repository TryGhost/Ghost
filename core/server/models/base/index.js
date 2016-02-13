// # Base Model
// This is the model from which all other Ghost models extend. The model is based on Bookshelf.Model, and provides
// several basic behaviours such as UUIDs, as well as a set of Data methods for accessing information from the database.
//
// The models are internal to Ghost, only the API and some internal functions such as migration and import/export
// accesses the models directly. All other parts of Ghost, including the blog frontend, admin UI, and apps are only
// allowed to access data via the API.
var _          = require('lodash'),
    bookshelf  = require('bookshelf'),
    config     = require('../../config'),
    db         = require('../../data/db'),
    errors     = require('../../errors'),
    filters    = require('../../filters'),
    moment     = require('moment'),
    Promise    = require('bluebird'),
    sanitizer  = require('validator').sanitize,
    schema     = require('../../data/schema'),
    utils      = require('../../utils'),
    uuid       = require('node-uuid'),
    validation = require('../../data/validation'),
    plugins    = require('../plugins'),
    i18n       = require('../../i18n'),

    ghostBookshelf,
    proto;

// ### ghostBookshelf
// Initializes a new Bookshelf instance called ghostBookshelf, for reference elsewhere in Ghost.
ghostBookshelf = bookshelf(db.knex);

// Load the Bookshelf registry plugin, which helps us avoid circular dependencies
ghostBookshelf.plugin('registry');

// Load the Ghost access rules plugin, which handles passing permissions/context through the model layer
ghostBookshelf.plugin(plugins.accessRules);

// Load the Ghost filter plugin, which handles applying a 'filter' to findPage requests
ghostBookshelf.plugin(plugins.filter);

// Load the Ghost include count plugin, which allows for the inclusion of cross-table counts
ghostBookshelf.plugin(plugins.includeCount);

// Load the Ghost pagination plugin, which gives us the `fetchPage` method on Models
ghostBookshelf.plugin(plugins.pagination);

// Cache an instance of the base model prototype
proto = ghostBookshelf.Model.prototype;

// ## ghostBookshelf.Model
// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
ghostBookshelf.Model = ghostBookshelf.Model.extend({
    // Bookshelf `hasTimestamps` - handles created_at and updated_at properties
    hasTimestamps: true,

    // Ghost option handling - get permitted attributes from server/data/schema.js, where the DB schema is defined
    permittedAttributes: function permittedAttributes() {
        return _.keys(schema.tables[this.tableName]);
    },

    // Bookshelf `defaults` - default values setup on every model creation
    defaults: function defaults() {
        return {
            uuid: uuid.v4()
        };
    },

    // Bookshelf `initialize` - declare a constructor-like method for model creation
    initialize: function initialize() {
        var self = this,
            options = arguments[1] || {};

        // make options include available for toJSON()
        if (options.include) {
            this.include = _.clone(options.include);
        }

        this.on('creating', this.creating, this);
        this.on('saving', function onSaving(model, attributes, options) {
            return Promise.resolve(self.saving(model, attributes, options)).then(function then() {
                return self.validate(model, attributes, options);
            });
        });
    },

    validate: function validate() {
        return validation.validateSchema(this.tableName, this.toJSON());
    },

    creating: function creating(newObj, attr, options) {
        if (!this.get('created_by')) {
            this.set('created_by', this.contextUser(options));
        }
    },

    saving: function saving(newObj, attr, options) {
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
        // Store the previous attributes so we can tell what was updated later
        this._updatedAttributes = newObj.previousAttributes();

        this.set('updated_by', this.contextUser(options));
    },

    // Base prototype properties will go here
    // Fix problems with dates
    fixDates: function fixDates(attrs) {
        var self = this;

        _.each(attrs, function each(value, key) {
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
    fixBools: function fixBools(attrs) {
        var self = this;
        _.each(attrs, function each(value, key) {
            if (schema.tables[self.tableName].hasOwnProperty(key)
                    && schema.tables[self.tableName][key].type === 'bool') {
                attrs[key] = value ? true : false;
            }
        });

        return attrs;
    },

    // Get the user from the options object
    contextUser: function contextUser(options) {
        // Default to context user
        if (options.context && options.context.user) {
            return options.context.user;
        // Other wise use the internal override
        } else if (options.context && options.context.internal) {
            return 1;
        } else {
            errors.logAndThrowError(new Error(i18n.t('errors.models.base.index.missingContext')));
        }
    },

    // format date before writing to DB, bools work
    format: function format(attrs) {
        return this.fixDates(attrs);
    },

    // format data and bool when fetching from DB
    parse: function parse(attrs) {
        return this.fixBools(this.fixDates(attrs));
    },

    toJSON: function toJSON(options) {
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

        _.each(this.relations, function each(relation, key) {
            if (key.substring(0, 7) !== '_pivot_') {
                // if include is set, expand to full object
                var fullKey = _.isEmpty(options.baseKey) ? key : options.baseKey + '.' + key;
                if (_.contains(self.include, fullKey)) {
                    attrs[key] = relation.toJSON(_.extend({}, options, {baseKey: fullKey, include: self.include}));
                }
            }
        });

        // @TODO upgrade bookshelf & knex and use serialize & toJSON to do this in a neater way (see #6103)
        return proto.finalize.call(this, attrs);
    },

    sanitize: function sanitize(attr) {
        return sanitizer(this.get(attr)).xss();
    },

    // Get attributes that have been updated (values before a .save() call)
    updatedAttributes: function updatedAttributes() {
        return this._updatedAttributes || {};
    },

    // Get a specific updated attribute value
    updated: function updated(attr) {
        return this.updatedAttributes()[attr];
    }
}, {
    // ## Data Utility Functions

    /**
     * Returns an array of keys permitted in every method's `options` hash.
     * Can be overridden and added to by a model's `permittedOptions` method.
     * @return {Object} Keys allowed in the `options` hash of every model's method.
     */
    permittedOptions: function permittedOptions() {
        // terms to whitelist for all methods.
        return ['context', 'include', 'transacting'];
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
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
    filterOptions: function filterOptions(options, methodName) {
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
    findAll: function findAll(options) {
        options = this.filterOptions(options, 'findAll');
        options.withRelated = _.union(options.withRelated, options.include);
        return this.forge().fetchAll(options).then(function then(result) {
            if (options.include) {
                _.each(result.models, function each(item) {
                    item.include = options.include;
                });
            }
            return result;
        });
    },

    /**
     * ### Find Page
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * **response:**
     *
     *     {
     *         posts: [
     *         {...}, ...
     *     ],
     *     page: __,
     *     limit: __,
     *     pages: __,
     *     total: __
     *     }
     *
     * @param {Object} options
     */
    findPage: function findPage(options) {
        options = options || {};

        var self = this,
            itemCollection = this.forge(null, {context: options.context}),
            tableName      = _.result(this.prototype, 'tableName');

        // Set this to true or pass ?debug=true as an API option to get output
        itemCollection.debug = options.debug && process.env.NODE_ENV !== 'production';

        // Filter options so that only permitted ones remain
        options = this.filterOptions(options, 'findPage');

        // This applies default properties like 'staticPages' and 'status'
        // And then converts them to 'where' options... this behaviour is effectively deprecated in favour
        // of using filter - it's only be being kept here so that we can transition cleanly.
        this.processOptions(options);

        // Add Filter behaviour
        itemCollection.applyFilters(options);

        // Handle related objects
        // TODO: this should just be done for all methods @ the API level
        options.withRelated = _.union(options.withRelated, options.include);

        // Ensure only valid fields/columns are added to query
        if (options.columns) {
            options.columns = _.intersection(options.columns, this.prototype.permittedAttributes());
        }

        if (options.order) {
            options.order = self.parseOrderOption(options.order, options.include);
        } else {
            options.order = self.orderDefaultOptions();
        }

        return itemCollection.fetchPage(options).then(function formatResponse(response) {
            var data = {};
            data[tableName] = response.collection.toJSON(options);
            data.meta = {pagination: response.pagination};

            return data;
        });
    },

    /**
     * ### Find One
     * Naive find one where data determines what to match on
     * @param {Object} data
     * @param {Object} options (optional)
     * @return {Promise(ghostBookshelf.Model)} Single Model
     */
    findOne: function findOne(data, options) {
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
    edit: function edit(data, options) {
        var id = options.id;
        data = this.filterData(data);
        options = this.filterOptions(options, 'edit');

        return this.forge({id: id}).fetch(options).then(function then(object) {
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
    add: function add(data, options) {
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
    destroy: function destroy(options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        // Fetch the object before destroying it, so that the changed data is available to events
        return this.forge({id: id}).fetch(options).then(function then(obj) {
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
    generateSlug: function generateSlug(Model, base, options) {
        var slug,
            slugTryCount = 1,
            baseName = Model.prototype.tableName.replace(/s$/, ''),
            // Look for a matching slug, append an incrementing number if so
            checkIfSlugExists, longSlug;

        checkIfSlugExists = function checkIfSlugExists(slugToFind) {
            var args = {slug: slugToFind};
            // status is needed for posts
            if (options && options.status) {
                args.status = options.status;
            }
            return Model.findOne(args, options).then(function then(found) {
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

        slug = utils.safeString(base, options);

        // If it's a user, let's try to cut it down (unless this is a human request)
        if (baseName === 'user' && options && options.shortSlug && slugTryCount === 1 && slug !== 'ghost-owner') {
            longSlug = slug;
            slug = (slug.indexOf('-') > -1) ? slug.substr(0, slug.indexOf('-')) : slug;
        }

        // Check the filtered slug doesn't match any of the reserved keywords
        return filters.doFilter('slug.reservedSlugs', config.slugs.reserved).then(function then(slugList) {
            // Some keywords cannot be changed
            slugList = _.union(slugList, config.slugs.protected);

            return _.contains(slugList, slug) ? slug + '-' + baseName : slug;
        }).then(function then(slug) {
            // if slug is empty after trimming use the model name
            if (!slug) {
                slug = baseName;
            }
            // Test for duplicate slugs.
            return checkIfSlugExists(slug);
        });
    },

    parseOrderOption: function (order, include) {
        var permittedAttributes, result, rules;

        permittedAttributes = this.prototype.permittedAttributes();
        if (include && include.indexOf('count.posts') > -1) {
            permittedAttributes.push('count.posts');
        }
        result = {};
        rules = order.split(',');

        _.each(rules, function (rule) {
            var match, field, direction;

            match = /^([a-z0-9_\.]+)\s+(asc|desc)$/i.exec(rule.trim());

            // invalid order syntax
            if (!match) {
                return;
            }

            field = match[1].toLowerCase();
            direction = match[2].toUpperCase();

            if (permittedAttributes.indexOf(field) === -1) {
                return;
            }

            result[field] = direction;
        });

        return result;
    }

});

// Export ghostBookshelf for use elsewhere
module.exports = ghostBookshelf;
