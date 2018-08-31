// # Base Model
// This is the model from which all other Ghost models extend. The model is based on Bookshelf.Model, and provides
// several basic behaviours such as UUIDs, as well as a set of Data methods for accessing information from the database.
//
// The models are internal to Ghost, only the API and some internal functions such as migration and import/export
// accesses the models directly. All other parts of Ghost, including the blog frontend, admin UI, and apps are only
// allowed to access data via the API.
const _ = require('lodash'),
    bookshelf = require('bookshelf'),
    moment = require('moment'),
    Promise = require('bluebird'),
    gql = require('ghost-gql'),
    ObjectId = require('bson-objectid'),
    debug = require('ghost-ignition').debug('models:base'),
    config = require('../../config'),
    db = require('../../data/db'),
    common = require('../../lib/common'),
    security = require('../../lib/security'),
    filters = require('../../filters'),
    schema = require('../../data/schema'),
    urlService = require('../../services/url'),
    validation = require('../../data/validation'),
    plugins = require('../plugins');

let ghostBookshelf,
    proto;

// ### ghostBookshelf
// Initializes a new Bookshelf instance called ghostBookshelf, for reference elsewhere in Ghost.
ghostBookshelf = bookshelf(db.knex);

// Load the Bookshelf registry plugin, which helps us avoid circular dependencies
ghostBookshelf.plugin('registry');

// Add committed/rollback events.
ghostBookshelf.plugin(plugins.transactionEvents);

// Load the Ghost filter plugin, which handles applying a 'filter' to findPage requests
ghostBookshelf.plugin(plugins.filter);

// Load the Ghost include count plugin, which allows for the inclusion of cross-table counts
ghostBookshelf.plugin(plugins.includeCount);

// Load the Ghost pagination plugin, which gives us the `fetchPage` method on Models
ghostBookshelf.plugin(plugins.pagination);

// Update collision plugin
ghostBookshelf.plugin(plugins.collision);

// Manages nested updates (relationships)
ghostBookshelf.plugin('bookshelf-relations', {
    allowedOptions: ['context', 'importing', 'migrating'],
    unsetRelations: true,
    hooks: {
        belongsToMany: {
            after: function (existing, targets, options) {
                // reorder tags/authors
                var queryOptions = {
                    query: {
                        where: {}
                    }
                };

                // CASE: disable after hook for specific relations
                if (['permissions_roles'].indexOf(existing.relatedData.joinTableName) !== -1) {
                    return Promise.resolve();
                }

                return Promise.each(targets.models, function (target, index) {
                    queryOptions.query.where[existing.relatedData.otherKey] = target.id;

                    return existing.updatePivot({
                        sort_order: index
                    }, _.extend({}, options, queryOptions));
                });
            },
            beforeRelationCreation: function onCreatingRelation(model, data) {
                data.id = ObjectId.generate();
            }
        }
    }
});

// Cache an instance of the base model prototype
proto = ghostBookshelf.Model.prototype;

// ## ghostBookshelf.Model
// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
ghostBookshelf.Model = ghostBookshelf.Model.extend({
    // Bookshelf `hasTimestamps` - handles created_at and updated_at properties
    hasTimestamps: true,

    // https://github.com/bookshelf/bookshelf/commit/a55db61feb8ad5911adb4f8c3b3d2a97a45bd6db
    parsedIdAttribute: function () {
        return false;
    },

    // Ghost option handling - get permitted attributes from server/data/schema.js, where the DB schema is defined
    permittedAttributes: function permittedAttributes() {
        return _.keys(schema.tables[this.tableName]);
    },

    // When loading an instance, subclasses can specify default to fetch
    defaultColumnsToFetch: function defaultColumnsToFetch() {
        return [];
    },

    /**
     * @NOTE
     * We have to remember the `_previousAttributes` attributes, because when destroying resources
     * We listen on the `onDestroyed` event and Bookshelf resets these properties right after the event.
     * If the query runs in a txn, `_previousAttributes` will be empty.
     */
    emitChange: function (model, event, options) {
        debug(model.tableName, event);

        const previousAttributes = model._previousAttributes;

        if (!options.transacting) {
            return common.events.emit(event, model, options);
        }

        if (!model.ghostEvents) {
            model.ghostEvents = [];

            // CASE: when importing, deleting or migrating content, lot's of model queries are happening in one transaction
            //       lot's of model events will be triggered. we ensure we set the max listeners to infinity.
            //       we are using `once` - we auto remove the listener afterwards
            if (options.importing || options.destroyAll || options.migrating) {
                options.transacting.setMaxListeners(0);
            }

            options.transacting.once('committed', (committed) => {
                if (!committed) {
                    return;
                }

                _.each(this.ghostEvents, (ghostEvent) => {
                    model._previousAttributes = previousAttributes;
                    common.events.emit(ghostEvent, model, _.omit(options, 'transacting'));
                });

                delete model.ghostEvents;
            });
        }

        model.ghostEvents.push(event);
    },

    // Bookshelf `initialize` - declare a constructor-like method for model creation
    initialize: function initialize() {
        var self = this;

        // NOTE: triggered before `creating`/`updating`
        this.on('saving', function onSaving(newObj, attrs, options) {
            if (options.method === 'insert') {
                // id = 0 is still a valid value for external usage
                if (_.isUndefined(newObj.id) || _.isNull(newObj.id)) {
                    newObj.setId();
                }
            }
        });

        [
            'fetching',
            'fetching:collection',
            'fetched',
            'fetched:collection',
            'creating',
            'created',
            'updating',
            'updated',
            'destroying',
            'destroyed',
            'saving',
            'saved'
        ].forEach(function (eventName) {
            var functionName = 'on' + eventName[0].toUpperCase() + eventName.slice(1);

            if (functionName.indexOf(':') !== -1) {
                functionName = functionName.slice(0, functionName.indexOf(':'))
                    + functionName[functionName.indexOf(':') + 1].toUpperCase()
                    + functionName.slice(functionName.indexOf(':') + 2);
                functionName = functionName.replace(':', '');
            }

            if (!self[functionName]) {
                return;
            }

            self.on(eventName, self[functionName]);
        });

        // NOTE: Please keep here. If we don't initialize the parent, bookshelf-relations won't work.
        proto.initialize.call(this);
    },

    /**
     * Do not call `toJSON`. This can remove properties e.g. password.
     * @returns {*}
     */
    onValidate: function onValidate(model, columns, options) {
        this.setEmptyValuesToNull();

        return validation.validateSchema(this.tableName, this, options);
    },

    /**
     * http://knexjs.org/#Builder-forUpdate
     * https://dev.mysql.com/doc/refman/5.7/en/innodb-locking-reads.html
     *
     * Lock target collection/model for further update operations.
     * This avoids collisions and possible content override cases.
     */
    onFetching: function onFetching(model, columns, options) {
        if (options.forUpdate && options.transacting) {
            options.query.forUpdate();
        }
    },

    onFetchingCollection: function onFetchingCollection(model, columns, options) {
        if (options.forUpdate && options.transacting) {
            options.query.forUpdate();
        }
    },

    onSaving: function onSaving(newObj) {
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
        // Store the previous attributes so we can tell what was updated later
        this._updatedAttributes = newObj.previousAttributes();
    },

    /**
     * Adding resources implies setting these properties on the server side
     * - set `created_by` based on the context
     * - set `updated_by` based on the context
     * - the bookshelf `timestamps` plugin sets `created_at` and `updated_at`
     *   - if plugin is disabled (e.g. import) we have a fallback condition
     *
     * Exceptions: internal context or importing
     */
    onCreating: function onCreating(newObj, attr, options) {
        if (schema.tables[this.tableName].hasOwnProperty('created_by')) {
            if (!options.importing || (options.importing && !this.get('created_by'))) {
                this.set('created_by', this.contextUser(options));
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('updated_by')) {
            if (!options.importing) {
                this.set('updated_by', this.contextUser(options));
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('created_at')) {
            if (!newObj.get('created_at')) {
                newObj.set('created_at', new Date());
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('updated_at')) {
            if (!newObj.get('updated_at')) {
                newObj.set('updated_at', new Date());
            }
        }

        return Promise.resolve(this.onValidate(newObj, attr, options));
    },

    /**
     * Changing resources implies setting these properties on the server side
     * - set `updated_by` based on the context
     * - ensure `created_at` never changes
     * - ensure `created_by` never changes
     * - the bookshelf `timestamps` plugin sets `updated_at` automatically
     *
     * Exceptions:
     *   - importing data
     *   - internal context
     *   - if no context
     */
    onUpdating: function onUpdating(newObj, attr, options) {
        if (schema.tables[this.tableName].hasOwnProperty('updated_by')) {
            if (!options.importing && !options.migrating) {
                this.set('updated_by', this.contextUser(options));
            }
        }

        if (options && options.context && !options.internal && !options.importing) {
            if (schema.tables[this.tableName].hasOwnProperty('created_at')) {
                if (newObj.hasDateChanged('created_at', {beforeWrite: true})) {
                    newObj.set('created_at', this.previous('created_at'));
                }
            }

            if (schema.tables[this.tableName].hasOwnProperty('created_by')) {
                if (newObj.hasChanged('created_by')) {
                    newObj.set('created_by', this.previous('created_by'));
                }
            }
        }

        // CASE: do not allow setting only the `updated_at` field, exception: importing
        if (schema.tables[this.tableName].hasOwnProperty('updated_at') && !options.importing) {
            if (options.migrating) {
                newObj.set('updated_at', newObj.previous('updated_at'));
            } else if (newObj.hasChanged() && Object.keys(newObj.changed).length === 1 && newObj.changed.updated_at) {
                newObj.set('updated_at', newObj.previous('updated_at'));
            }
        }

        return Promise.resolve(this.onValidate(newObj, attr, options));
    },

    /**
     * before we insert dates into the database, we have to normalize
     * date format is now in each db the same
     */
    fixDatesWhenSave: function fixDates(attrs) {
        var self = this;

        _.each(attrs, function each(value, key) {
            if (value !== null
                && schema.tables[self.tableName].hasOwnProperty(key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                attrs[key] = moment(value).format('YYYY-MM-DD HH:mm:ss');
            }
        });

        return attrs;
    },

    /**
     * all supported databases (sqlite, mysql) return different values
     *
     * sqlite:
     *   - knex returns a UTC String (2018-04-12 20:50:35)
     * mysql:
     *   - knex wraps the UTC value into a local JS Date
     */
    fixDatesWhenFetch: function fixDates(attrs) {
        var self = this, dateMoment;

        _.each(attrs, function each(value, key) {
            if (value !== null
                && schema.tables[self.tableName].hasOwnProperty(key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                dateMoment = moment(value);

                // CASE: You are somehow able to store e.g. 0000-00-00 00:00:00
                // Protect the code base and return the current date time.
                if (dateMoment.isValid()) {
                    attrs[key] = dateMoment.startOf('seconds').toDate();
                } else {
                    attrs[key] = moment().startOf('seconds').toDate();
                }
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

    // Sets given values to `null`
    setEmptyValuesToNull: function setEmptyValuesToNull() {
        var self = this,
            attr;

        if (!this.emptyStringProperties) {
            return;
        }

        attr = this.emptyStringProperties();

        _.each(attr, function (value) {
            if (self.get(value) === '') {
                self.set(value, null);
            }
        });
    },

    // Get the user from the options object
    contextUser: function contextUser(options) {
        options = options || {};
        options.context = options.context || {};

        if (options.context.user || ghostBookshelf.Model.isExternalUser(options.context.user)) {
            return options.context.user;
        } else if (options.context.internal) {
            return ghostBookshelf.Model.internalUser;
        } else if (this.get('id')) {
            return this.get('id');
        } else if (options.context.external) {
            return ghostBookshelf.Model.externalUser;
        } else {
            throw new common.errors.NotFoundError({
                message: common.i18n.t('errors.models.base.index.missingContext'),
                level: 'critical'
            });
        }
    },

    // format date before writing to DB, bools work
    format: function format(attrs) {
        return this.fixDatesWhenSave(attrs);
    },

    // format data and bool when fetching from DB
    parse: function parse(attrs) {
        return this.fixBools(this.fixDatesWhenFetch(attrs));
    },

    /**
     * `shallow`    - won't return relations
     * `omitPivot`  - won't return pivot fields
     *
     * `toJSON` calls `serialize`.
     *
     * @param unfilteredOptions
     * @returns {*}
     */
    toJSON: function toJSON(unfilteredOptions) {
        const options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'toJSON');
        options.omitPivot = true;

        return proto.toJSON.call(this, options);
    },

    // Get attributes that have been updated (values before a .save() call)
    updatedAttributes: function updatedAttributes() {
        return this._updatedAttributes || {};
    },

    // Get a specific updated attribute value
    updated: function updated(attr) {
        return this.updatedAttributes()[attr];
    },

    /**
     * There is difference between `updated` and `previous`:
     * Depending on the hook (before or after writing into the db), both fields have a different meaning.
     * e.g. onSaving  -> before db write (has to use previous)
     *      onUpdated -> after db write  (has to use updated)
     *
     * hasDateChanged('attr', {beforeWrite: true})
     */
    hasDateChanged: function (attr, options) {
        options = options || {};
        return moment(this.get(attr)).diff(moment(options.beforeWrite ? this.previous(attr) : this.updated(attr))) !== 0;
    },

    /**
     * we auto generate a GUID for each resource
     * no auto increment
     */
    setId: function setId() {
        this.set('id', ObjectId.generate());
    }
}, {
    // ## Data Utility Functions

    /**
     * please use these static definitions when comparing id's
     * we keep type Number, because we have too many check's where we rely on Number
     * context.user ? true : false (if context.user is 0 as number, this condition is false)
     */
    internalUser: 1,
    externalUser: 0,

    isInternalUser: function isInternalUser(id) {
        return id === ghostBookshelf.Model.internalUser || id === ghostBookshelf.Model.internalUser.toString();
    },

    isExternalUser: function isExternalUser(id) {
        return id === ghostBookshelf.Model.externalUser || id === ghostBookshelf.Model.externalUser.toString();
    },

    /**
     * Returns an array of keys permitted in every method's `options` hash.
     * Can be overridden and added to by a model's `permittedOptions` method.
     *
     * importing: is used when import a JSON file or when migrating the database
     *
     * @return {Object} Keys allowed in the `options` hash of every model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        if (methodName === 'toJSON') {
            return ['shallow', 'withRelated', 'context', 'columns', 'absolute_urls'];
        }

        // terms to whitelist for all methods.
        return ['context', 'withRelated', 'transacting', 'importing', 'forUpdate', 'migrating'];
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * This filter should be called before each insert/update operation.
     *
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
        var permittedAttributes = this.prototype.permittedAttributes(),
            filteredData = _.pick(data, permittedAttributes),
            sanitizedData = this.sanitizeData(filteredData);

        return sanitizedData;
    },

    /**
     * `sanitizeData` ensures that client data is in the correct format for further operations.
     *
     * Dates:
     * - client dates are sent as ISO 8601 format (moment(..).format())
     * - server dates are in JS Date format
     *   >> when bookshelf fetches data from the database, all dates are in JS Dates
     *   >> see `parse`
     * - Bookshelf updates the model with the new client data via the `set` function
     * - Bookshelf uses a simple `isEqual` function from lodash to detect real changes
     * - .previous(attr) and .get(attr) returns false obviously
     * - internally we use our `hasDateChanged` if we have to compare previous/updated dates
     * - but Bookshelf is not in our control for this case
     *
     * @IMPORTANT
     * Before the new client data get's inserted again, the dates get's re-transformed into
     * proper strings, see `format`.
     *
     * @IMPORTANT
     * Sanitize relations.
     */
    sanitizeData: function sanitizeData(data) {
        var tableName = _.result(this.prototype, 'tableName'), date;

        _.each(data, (value, property) => {
            if (value !== null
                && schema.tables[tableName].hasOwnProperty(property)
                && schema.tables[tableName][property].type === 'dateTime'
                && typeof value === 'string'
            ) {
                date = new Date(value);

                // CASE: client sends `0000-00-00 00:00:00`
                if (isNaN(date)) {
                    throw new common.errors.ValidationError({
                        message: common.i18n.t('errors.models.base.invalidDate', {key: property}),
                        code: 'DATE_INVALID'
                    });
                }

                data[property] = moment(value).toDate();
            }

            if (this.prototype.relationships && this.prototype.relationships.indexOf(property) !== -1) {
                _.each(data[property], (relation, indexInArr) => {
                    _.each(relation, (value, relationProperty) => {
                        if (value !== null
                            && schema.tables[this.prototype.relationshipBelongsTo[property]].hasOwnProperty(relationProperty)
                            && schema.tables[this.prototype.relationshipBelongsTo[property]][relationProperty].type === 'dateTime'
                            && typeof value === 'string'
                        ) {
                            date = new Date(value);

                            // CASE: client sends `0000-00-00 00:00:00`
                            if (isNaN(date)) {
                                throw new common.errors.ValidationError({
                                    message: common.i18n.t('errors.models.base.invalidDate', {key: relationProperty}),
                                    code: 'DATE_INVALID'
                                });
                            }

                            data[property][indexInArr][relationProperty] = moment(value).toDate();
                        }
                    });
                });
            }
        });

        return data;
    },

    /**
     * Filters potentially unsafe `options` in a model method's arguments, so you can pass them to Bookshelf / Knex.
     * @param {Object} unfilteredOptions Represents options to filter in order to be passed to the Bookshelf query.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Object} The filtered results of `options`.
     */
    filterOptions: function filterOptions(unfilteredOptions, methodName, filterConfig) {
        unfilteredOptions = unfilteredOptions || {};
        filterConfig = filterConfig || {};

        if (unfilteredOptions.hasOwnProperty('include')) {
            throw new common.errors.IncorrectUsageError({
                message: 'The model layer expects using `withRelated`.'
            });
        }

        var options = _.cloneDeep(unfilteredOptions),
            extraAllowedProperties = filterConfig.extraAllowedProperties || [],
            permittedOptions;

        permittedOptions = this.permittedOptions(methodName, options);
        permittedOptions = _.union(permittedOptions, extraAllowedProperties);
        options = _.pick(options, permittedOptions);

        if (this.defaultRelations) {
            options = this.defaultRelations(methodName, options);
        }

        return options;
    },

    // ## Model Data Functions

    /**
     * ### Find All
     * Fetches all the data for a particular model
     * @param {Object} unfilteredOptions (optional)
     * @return {Promise(ghostBookshelf.Collection)} Collection of all Models
     */
    findAll: function findAll(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findAll'),
            itemCollection = this.forge();

        // transforms fictive keywords like 'all' (status:all) into correct allowed values
        if (this.processOptions) {
            this.processOptions(options);
        }

        itemCollection.applyDefaultAndCustomFilters(options);

        return itemCollection.fetchAll(options).then(function then(result) {
            if (options.withRelated) {
                _.each(result.models, function each(item) {
                    item.withRelated = options.withRelated;
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
     * @TODO:
     *   - this model function does return JSON O_O
     *   - if you refactor that out, you should double check the allowed filter options
     *   - because `toJSON` is called in here and is using the filtered options for the `findPage` function
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
     * @param {Object} unfilteredOptions
     */
    findPage: function findPage(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findPage'),
            itemCollection = this.forge(),
            tableName = _.result(this.prototype, 'tableName'),
            requestedColumns = options.columns;

        // Set this to true or pass ?debug=true as an API option to get output
        itemCollection.debug = options.debug && config.get('env') !== 'production';

        // This applies default properties like 'staticPages' and 'status'
        // And then converts them to 'where' options... this behaviour is effectively deprecated in favour
        // of using filter - it's only be being kept here so that we can transition cleanly.
        this.processOptions(options);

        // Add Filter behaviour
        itemCollection.applyDefaultAndCustomFilters(options);

        // Ensure only valid fields/columns are added to query
        // and append default columns to fetch
        if (options.columns) {
            options.columns = _.intersection(options.columns, this.prototype.permittedAttributes());
            options.columns = _.union(options.columns, this.prototype.defaultColumnsToFetch());
        }

        if (options.order) {
            options.order = this.parseOrderOption(options.order, options.withRelated);
        } else if (this.orderDefaultRaw) {
            options.orderRaw = this.orderDefaultRaw();
        } else {
            options.order = this.orderDefaultOptions();
        }

        return itemCollection.fetchPage(options).then(function formatResponse(response) {
            var data = {},
                models;

            options.columns = requestedColumns;
            models = response.collection.toJSON(options);

            // re-add any computed properties that were stripped out before the call to fetchPage
            // pick only requested before returning JSON
            data[tableName] = _.map(models, function transform(model) {
                return options.columns ? _.pick(model, options.columns) : model;
            });

            data.meta = {pagination: response.pagination};
            return data;
        });
    },

    /**
     * ### Find One
     * Naive find one where data determines what to match on
     * @param {Object} data
     * @param {Object} unfilteredOptions (optional)
     * @return {Promise(ghostBookshelf.Model)} Single Model
     */
    findOne: function findOne(data, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findOne');
        data = this.filterData(data);
        return this.forge(data).fetch(options);
    },

    /**
     * ### Edit
     * Naive edit
     *
     * We always forward the `method` option to Bookshelf, see http://bookshelfjs.org/#Model-instance-save.
     * Based on the `method` option Bookshelf and Ghost can determine if a query is an insert or an update.
     *
     * @param {Object} data
     * @param {Object} unfilteredOptions (optional)
     * @return {Promise(ghostBookshelf.Model)} Edited Model
     */
    edit: function edit(data, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'edit', {extraAllowedProperties: ['id']}),
            id = options.id,
            model = this.forge({id: id});

        data = this.filterData(data);

        // We allow you to disable timestamps when run migration, so that the posts `updated_at` value is the same
        if (options.importing) {
            model.hasTimestamps = false;
        }

        return model.fetch(options).then(function then(object) {
            if (object) {
                return object.save(data, _.merge({method: 'update'}, options));
            }
        });
    },

    /**
     * ### Add
     * Naive add
     * @param {Object} data
     * @param {Object} unfilteredOptions (optional)
     * @return {Promise(ghostBookshelf.Model)} Newly Added Model
     */
    add: function add(data, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'add'),
            model;

        data = this.filterData(data);
        model = this.forge(data);

        // We allow you to disable timestamps when importing posts so that the new posts `updated_at` value is the same
        // as the import json blob. More details refer to https://github.com/TryGhost/Ghost/issues/1696
        if (options.importing) {
            model.hasTimestamps = false;
        }

        // Bookshelf determines whether an operation is an update or an insert based on the id
        // Ghost auto-generates Object id's, so we need to tell Bookshelf here that we are inserting data
        options.method = 'insert';
        return model.save(null, options);
    },

    /**
     * ### Destroy
     * Naive destroy
     * @param {Object} unfilteredOptions (optional)
     * @return {Promise(ghostBookshelf.Model)} Empty Model
     */
    destroy: function destroy(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']}),
            id = options.id;

        // Fetch the object before destroying it, so that the changed data is available to events
        return this.forge({id: id})
            .fetch(options)
            .then(function then(obj) {
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

        // the slug may never be longer than the allowed limit of 191 chars, but should also
        // take the counter into count. We reduce a too long slug to 185 so we're always on the
        // safe side, also in terms of checking for existing slugs already.
        slug = security.string.safe(base, options);

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

        // Check the filtered slug doesn't match any of the reserved keywords
        return filters.doFilter('slug.reservedSlugs', config.get('slugs').reserved).then(function then(slugList) {
            // Some keywords cannot be changed
            slugList = _.union(slugList, urlService.utils.getProtectedSlugs());

            return _.includes(slugList, slug) ? slug + '-' + baseName : slug;
        }).then(function then(slug) {
            // if slug is empty after trimming use the model name
            if (!slug) {
                slug = baseName;
            }
            // Test for duplicate slugs.
            return checkIfSlugExists(slug);
        });
    },

    parseOrderOption: function (order, withRelated) {
        var permittedAttributes, result, rules;

        permittedAttributes = this.prototype.permittedAttributes();
        if (withRelated && withRelated.indexOf('count.posts') > -1) {
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
    },

    /**
     * All models which have a visibility property, can use this static helper function.
     * Filter models by visibility.
     *
     * @param {Array|Object} items
     * @param {Array} visibility
     * @param {Boolean} [explicit]
     * @param {Function} [fn]
     * @returns {Array|Object} filtered items
     */
    filterByVisibility: function filterByVisibility(items, visibility, explicit, fn) {
        var memo = _.isArray(items) ? [] : {};

        if (_.includes(visibility, 'all')) {
            return fn ? _.map(items, fn) : items;
        }

        // We don't want to change the structure of what is returned
        return _.reduce(items, function (items, item, key) {
            if (!item.visibility && !explicit || _.includes(visibility, item.visibility)) {
                var newItem = fn ? fn(item) : item;
                if (_.isArray(items)) {
                    memo.push(newItem);
                } else {
                    memo[key] = newItem;
                }
            }
            return memo;
        }, memo);
    },

    /**
     * Returns an Array of visibility values.
     * e.g. public,all => ['public, 'all']
     * @param visibility
     * @returns {*}
     */
    parseVisibilityString: function parseVisibilityString(visibility) {
        if (!visibility) {
            return ['public'];
        }

        return _.map(visibility.split(','), _.trim);
    },

    /**
     * If you want to fetch all data fast, i recommend using this function.
     * Bookshelf is just too slow, too much ORM overhead.
     *
     * If we e.g. instantiate for each object a model, it takes twice long.
     */
    raw_knex: {
        fetchAll: function (options) {
            options = options || {};

            const modelName = options.modelName;
            const tableNames = {
                Post: 'posts',
                User: 'users',
                Tag: 'tags'
            };
            const exclude = options.exclude;
            const filter = options.filter;
            const withRelated = options.withRelated;
            const withRelatedFields = options.withRelatedFields;
            const relations = {
                tags: {
                    targetTable: 'tags',
                    name: 'tags',
                    innerJoin: {
                        relation: 'posts_tags',
                        condition: ['posts_tags.tag_id', '=', 'tags.id']
                    },
                    select: ['posts_tags.post_id as post_id', 'tags.visibility'],
                    whereIn: 'posts_tags.post_id',
                    whereInKey: 'post_id',
                    orderBy: 'sort_order'
                },
                authors: {
                    targetTable: 'users',
                    name: 'authors',
                    innerJoin: {
                        relation: 'posts_authors',
                        condition: ['posts_authors.author_id', '=', 'users.id']
                    },
                    select: ['posts_authors.post_id as post_id'],
                    whereIn: 'posts_authors.post_id',
                    whereInKey: 'post_id',
                    orderBy: 'sort_order'
                }
            };

            let query = ghostBookshelf.knex(tableNames[modelName]);

            if (options.offset) {
                query.offset(options.offset);
            }

            if (options.limit) {
                query.limit(options.limit);
            }

            // exclude fields if enabled
            if (exclude) {
                const toSelect = _.keys(schema.tables[tableNames[modelName]]);

                _.each(exclude, (key) => {
                    if (toSelect.indexOf(key) !== -1) {
                        toSelect.splice(toSelect.indexOf(key), 1);
                    }
                });

                query.select(toSelect);
            }

            // filter data
            gql.knexify(query, gql.parse(filter));

            return query.then((objects) => {
                debug('fetched', modelName, filter);

                if (!objects.length) {
                    debug('No more entries found');
                    return Promise.resolve([]);
                }

                let props = {};

                if (!withRelated) {
                    return _.map(objects, (object) => {
                        object = ghostBookshelf._models[modelName].prototype.toJSON.bind({
                            attributes: object,
                            related: function (key) {
                                return object[key];
                            },
                            serialize: ghostBookshelf._models[modelName].prototype.serialize,
                            formatsToJSON: ghostBookshelf._models[modelName].prototype.formatsToJSON
                        })();

                        object = ghostBookshelf._models[modelName].prototype.fixBools(object);
                        object = ghostBookshelf._models[modelName].prototype.fixDatesWhenFetch(object);
                        return object;
                    });
                }

                _.each(withRelated, (withRelatedKey) => {
                    const relation = relations[withRelatedKey];

                    props[relation.name] = (() => {
                        debug('fetch withRelated', relation.name);

                        let query = db.knex(relation.targetTable);

                        // default fields to select
                        _.each(relation.select, (fieldToSelect) => {
                            query.select(fieldToSelect);
                        });

                        // custom fields to select
                        _.each(withRelatedFields[withRelatedKey], (toSelect) => {
                            query.select(toSelect);
                        });

                        query.innerJoin(
                            relation.innerJoin.relation,
                            relation.innerJoin.condition[0],
                            relation.innerJoin.condition[1],
                            relation.innerJoin.condition[2]
                        );

                        query.whereIn(relation.whereIn, _.map(objects, 'id'));
                        query.orderBy(relation.orderBy);

                        return query
                            .then((relations) => {
                                debug('fetched withRelated', relation.name);

                                // arr => obj[post_id] = [...] (faster access)
                                return relations.reduce((obj, item) => {
                                    if (!obj[item[relation.whereInKey]]) {
                                        obj[item[relation.whereInKey]] = [];
                                    }

                                    obj[item[relation.whereInKey]].push(_.omit(item, relation.select));
                                    return obj;
                                }, {});
                            });
                    })();
                });

                return Promise.props(props)
                    .then((relations) => {
                        debug('attach relations', modelName);

                        objects = _.map(objects, (object) => {
                            _.each(Object.keys(relations), (relation) => {
                                if (!relations[relation][object.id]) {
                                    object[relation] = [];
                                    return;
                                }

                                object[relation] = relations[relation][object.id];
                            });

                            object = ghostBookshelf._models[modelName].prototype.toJSON.bind({
                                attributes: object,
                                _originalOptions: {
                                    withRelated: Object.keys(relations)
                                },
                                related: function (key) {
                                    return object[key];
                                },
                                serialize: ghostBookshelf._models[modelName].prototype.serialize,
                                formatsToJSON: ghostBookshelf._models[modelName].prototype.formatsToJSON
                            })();

                            object = ghostBookshelf._models[modelName].prototype.fixBools(object);
                            object = ghostBookshelf._models[modelName].prototype.fixDatesWhenFetch(object);
                            return object;
                        });

                        debug('attached relations', modelName);

                        return objects;
                    });
            });
        }
    }
});

// Export ghostBookshelf for use elsewhere
module.exports = ghostBookshelf;
