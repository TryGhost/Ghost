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

// Load hasPosts plugin for authors models
ghostBookshelf.plugin(plugins.hasPosts);

// Manages nested updates (relationships)
ghostBookshelf.plugin('bookshelf-relations', {
    allowedOptions: ['context', 'importing', 'migrating'],
    unsetRelations: true,
    extendChanged: '_changed',
    attachPreviousRelations: true,
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

/**
 * @NOTE:
 *
 * We add actions step by step and define how they should look like.
 * Each post update triggers a couple of events, which we don't want to add actions for.
 *
 * e.g. transform post to page triggers a handful of events including `post.deleted` and `page.added`
 *
 * We protect adding too many and uncontrolled events.
 *
 * We could embedd adding actions more nicely in the future e.g. plugin.
 */
const addAction = (model, event, options) => {
    if (!model.wasChanged()) {
        return;
    }

    // CASE: model does not support actions at all
    if (!model.getAction) {
        return;
    }

    const action = model.getAction(event, options);

    // CASE: model does not support action for target event
    if (!action) {
        return;
    }

    const insert = (action) => {
        ghostBookshelf.model('Action')
            .add(action)
            .catch((err) => {
                if (_.isArray(err)) {
                    err = err[0];
                }

                common.logging.error(new common.errors.InternalServerError({
                    err
                }));
            });
    };

    if (options.transacting) {
        options.transacting.once('committed', (committed) => {
            if (!committed) {
                return;
            }

            insert(action);
        });
    } else {
        insert(action);
    }
};

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
        const _emit = (ghostEvent, model, opts) => {
            if (!model.wasChanged()) {
                return;
            }

            debug(model.tableName, ghostEvent);

            // @NOTE: Internal Ghost events. These are very granular e.g. post.published
            common.events.emit(ghostEvent, model, opts);
        };

        if (!options.transacting) {
            return _emit(event, model, options);
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

                _.each(this.ghostEvents, (obj) => {
                    _emit(obj.event, model, obj.options);
                });

                delete model.ghostEvents;
            });
        }

        model.ghostEvents.push({
            event: event,
            options: {
                importing: options.importing,
                context: options.context
            }
        });
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

        // @NOTE: Please keep here. If we don't initialize the parent, bookshelf-relations won't work.
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

    onSaving: function onSaving() {
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
    },

    onDestroying() {},

    /**
     * Adding resources implies setting these properties on the server side
     * - set `created_by` based on the context
     * - set `updated_by` based on the context
     * - the bookshelf `timestamps` plugin sets `created_at` and `updated_at`
     *   - if plugin is disabled (e.g. import) we have a fallback condition
     *
     * Exceptions: internal context or importing
     */
    onCreating: function onCreating(model, attr, options) {
        if (schema.tables[this.tableName].hasOwnProperty('created_by')) {
            if (!options.importing || (options.importing && !this.get('created_by'))) {
                this.set('created_by', String(this.contextUser(options)));
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('updated_by')) {
            if (!options.importing) {
                this.set('updated_by', String(this.contextUser(options)));
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('created_at')) {
            if (!model.get('created_at')) {
                model.set('created_at', new Date());
            }
        }

        if (schema.tables[this.tableName].hasOwnProperty('updated_at')) {
            if (!model.get('updated_at')) {
                model.set('updated_at', new Date());
            }
        }

        return Promise.resolve(this.onValidate(model, attr, options))
            .then(() => {
                /**
                 * @NOTE:
                 *
                 * The API requires only specific attributes to send. If we don't set the rest explicitly to null,
                 * we end up in a situation that on "created" events the field set is incomplete, which is super confusing
                 * and hard to work with if you trigger internal events, which rely on full field set. This ensures consistency.
                 *
                 * @NOTE:
                 *
                 * Happens after validation to ensure we don't set fields which are not nullable on db level.
                 */
                _.each(Object.keys(schema.tables[this.tableName]), (columnKey) => {
                    if (model.get(columnKey) === undefined) {
                        model.set(columnKey, null);
                    }
                });

                model._changed = _.cloneDeep(model.changed);
            });
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
     *
     * @deprecated: x_by fields (https://github.com/TryGhost/Ghost/issues/10286)
     */
    onUpdating: function onUpdating(model, attr, options) {
        if (this.relationships) {
            model.changed = _.omit(model.changed, this.relationships);
        }

        if (schema.tables[this.tableName].hasOwnProperty('updated_by')) {
            if (!options.importing && !options.migrating) {
                this.set('updated_by', String(this.contextUser(options)));
            }
        }

        if (options && options.context && !options.context.internal && !options.importing) {
            if (schema.tables[this.tableName].hasOwnProperty('created_at')) {
                if (model.hasDateChanged('created_at', {beforeWrite: true})) {
                    model.set('created_at', this.previous('created_at'));
                }
            }

            if (schema.tables[this.tableName].hasOwnProperty('created_by')) {
                if (model.hasChanged('created_by')) {
                    model.set('created_by', String(this.previous('created_by')));
                }
            }
        }

        // CASE: do not allow setting only the `updated_at` field, exception: importing
        if (schema.tables[this.tableName].hasOwnProperty('updated_at') && !options.importing) {
            if (options.migrating) {
                model.set('updated_at', model.previous('updated_at'));
            } else if (Object.keys(model.changed).length === 1 && model.changed.updated_at) {
                model.set('updated_at', model.previous('updated_at'));
                delete model.changed.updated_at;
            }
        }

        model._changed = _.cloneDeep(model.changed);

        return Promise.resolve(this.onValidate(model, attr, options));
    },

    onCreated(model, attrs, options) {
        addAction(model, 'added', options);
    },

    onUpdated(model, attrs, options) {
        addAction(model, 'edited', options);
    },

    onDestroyed(model, options) {
        if (!model._changed) {
            model._changed = {};
        }

        // @NOTE: Bookshelf destroys ".changed" right after this event, but we should not throw away the information
        //        It is useful for webhooks, events etc.
        // @NOTE: Bookshelf returns ".changed = {empty...}" on destroying (https://github.com/bookshelf/bookshelf/issues/1943)
        Object.assign(model._changed, _.cloneDeep(model.changed));

        addAction(model, 'deleted', options);
    },

    onSaved() {},

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

    getNullableStringProperties() {
        const table = schema.tables[this.tableName];
        return Object.keys(table).filter(column => table[column].nullable);
    },

    setEmptyValuesToNull: function setEmptyValuesToNull() {
        const nullableStringProps = this.getNullableStringProperties();
        return nullableStringProps.forEach((prop) => {
            if (this.get(prop) === '') {
                this.set(prop, null);
            }
        });
    },

    getActor(options = {context: {}}) {
        if (options.context && options.context.integration) {
            return {
                id: options.context.integration.id,
                type: 'integration'
            };
        }

        if (options.context && options.context.user) {
            return {
                id: options.context.user,
                type: 'user'
            };
        }

        return null;
    },

    // Get the user from the options object
    contextUser: function contextUser(options) {
        options = options || {};
        options.context = options.context || {};

        if (options.context.user || ghostBookshelf.Model.isExternalUser(options.context.user)) {
            return options.context.user;
        } else if (options.context.integration) {
            /**
             * @NOTE:
             *
             * This is a dirty hotfix for v0.1 only.
             * The `x_by` columns are getting deprecated soon (https://github.com/TryGhost/Ghost/issues/10286).
             *
             * We return the owner ID '1' in case an integration updates or creates
             * resources. v0.1 will continue to use the `x_by` columns. v0.1 does not support integrations.
             * API v2 will introduce a new feature to solve inserting/updating resources
             * from users or integrations. API v2 won't expose `x_by` columns anymore.
             *
             * ---
             *
             * Why using ID '1'? WAIT. What???????
             *
             * See https://github.com/TryGhost/Ghost/issues/9299.
             *
             * We currently don't read the correct owner ID from the database and assume it's '1'.
             * This is a leftover from switching from auto increment ID's to Object ID's.
             * But this takes too long to refactor out now. If an internal update happens, we also
             * use ID '1'. This logic exists for a LONG while now. The owner ID only changes from '1' to something else,
             * if you transfer ownership.
             */
            return ghostBookshelf.Model.internalUser;
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

        // CASE: get JSON of previous attrs
        if (options.previous) {
            const clonedModel = _.cloneDeep(this);
            clonedModel.attributes = this._previousAttributes;

            if (this.relationships) {
                this.relationships.forEach((relation) => {
                    if (this._previousRelations && this._previousRelations.hasOwnProperty(relation)) {
                        clonedModel.related(relation).models = this._previousRelations[relation].models;
                    }
                });
            }

            return proto.toJSON.call(clonedModel, options);
        }

        return proto.toJSON.call(this, options);
    },

    hasDateChanged: function (attr) {
        return moment(this.get(attr)).diff(moment(this.previous(attr))) !== 0;
    },

    /**
     * we auto generate a GUID for each resource
     * no auto increment
     */
    setId: function setId() {
        this.set('id', ObjectId.generate());
    },

    wasChanged() {
        /**
         * @NOTE:
         * Not every model & interaction is currently set up to handle "._changed".
         * e.g. we trigger a manual event for "tag.attached", where as "._changed" is undefined.
         *
         * Keep "true" till we are sure that "._changed" is always a thing.
         */
        if (!this._changed) {
            return true;
        }

        if (!Object.keys(this._changed).length) {
            return false;
        }

        return true;
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
        const baseOptions = ['context', 'withRelated'];
        const extraOptions = ['transacting', 'importing', 'forUpdate', 'migrating'];

        switch (methodName) {
        case 'toJSON':
            return baseOptions.concat('shallow', 'columns', 'previous');
        case 'destroy':
            return baseOptions.concat(extraOptions, ['id', 'destroyBy', 'require']);
        case 'edit':
            return baseOptions.concat(extraOptions, ['id', 'require']);
        case 'findOne':
            return baseOptions.concat(extraOptions, ['columns', 'require']);
        case 'findAll':
            return baseOptions.concat(extraOptions, ['columns']);
        case 'findPage':
            return baseOptions.concat(extraOptions, ['filter', 'order', 'page', 'limit', 'columns']);
        default:
            return baseOptions.concat(extraOptions);
        }
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
     * - internally we use our `hasDateChanged` if we have to compare previous dates
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

        // @TODO: we can't use order raw when running migrations (see https://github.com/tgriesser/knex/issues/2763)
        if (this.orderDefaultRaw && !options.migrating) {
            itemCollection.query((qb) => {
                qb.orderByRaw(this.orderDefaultRaw(options));
            });
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
     * **response:**
     *
     *     {
     *         data: [
     *             {...}, ...
     *         ],
     *         meta: {
     *             pagination: {
     *                 page: __,
     *                 limit: __,
     *                 pages: __,
     *                 total: __
     *             }
     *         }
     *     }
     *
     * @param {Object} unfilteredOptions
     */
    findPage: function findPage(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findPage'),
            itemCollection = this.forge(),
            requestedColumns = options.columns;

        // Set this to true or pass ?debug=true as an API option to get output
        itemCollection.debug = options.debug && config.get('env') !== 'production';

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
            options.orderRaw = this.orderDefaultRaw(options);
        } else if (this.orderDefaultOptions) {
            options.order = this.orderDefaultOptions();
        }

        return itemCollection.fetchPage(options).then(function formatResponse(response) {
            // Attributes are being filtered here, so they are not leaked into calling layer
            // where models are serialized to json and do not do more filtering.
            // Re-add and pick any computed properties that were stripped before fetchPage call.
            const data = response.collection.models.map((model) => {
                if (requestedColumns) {
                    model.attributes = _.pick(model.attributes, requestedColumns);
                    model._previousAttributes = _.pick(model._previousAttributes, requestedColumns);
                }

                return model;
            });

            return {
                data: data,
                meta: {pagination: response.pagination}
            };
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
        const options = this.filterOptions(unfilteredOptions, 'findOne');
        data = this.filterData(data);
        const model = this.forge(data);

        // @NOTE: The API layer decides if this option is allowed
        if (options.filter) {
            model.applyDefaultAndCustomFilters(options);
        }

        // Ensure only valid fields/columns are added to query
        if (options.columns) {
            options.columns = _.intersection(options.columns, this.prototype.permittedAttributes());
        }

        return model.fetch(options);
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
        const options = this.filterOptions(unfilteredOptions, 'edit');
        const id = options.id;
        const model = this.forge({id: id});

        data = this.filterData(data);

        // @NOTE: The API layer decides if this option is allowed
        if (options.filter) {
            model.applyDefaultAndCustomFilters(options);
        }

        // We allow you to disable timestamps when run migration, so that the posts `updated_at` value is the same
        if (options.importing) {
            model.hasTimestamps = false;
        }

        return model
            .fetch(options)
            .then((object) => {
                if (object) {
                    options.method = 'update';
                    return object.save(data, options);
                }

                throw new common.errors.NotFoundError();
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
        const options = this.filterOptions(unfilteredOptions, 'destroy');

        if (!options.destroyBy) {
            options.destroyBy = {
                id: options.id
            };
        }

        // Fetch the object before destroying it, so that the changed data is available to events
        return this.forge(options.destroyBy)
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

        const removeInvisibleUnicode = (str) => {
            // taken from https://github.com/slevithan/xregexp/blob/20ab3d7a59035649327b8acb1cf372afb5f71f83/tools/output/categories.js#L6
            const invisibleLetters = /[\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u0380-\u0383\u038B\u038D\u03A2\u0530\u0557\u0558\u058B\u058C\u0590\u05C8-\u05CF\u05EB-\u05EE\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB\u07FC\u082E\u082F\u083F\u085C\u085D\u085F\u086B-\u089F\u08B5\u08BE-\u08D2\u08E2\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A77-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C77\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D04\u0D0D\u0D11\u0D45\u0D49\u0D50-\u0D53\u0D64\u0D65\u0D80\u0D81\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E86\u0E89\u0E8B\u0E8C\u0E8E-\u0E93\u0E98\u0EA0\u0EA4\u0EA6\u0EA8\u0EA9\u0EAC\u0EBA\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F6\u13F7\u13FE\u13FF\u169D-\u169F\u16F9-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180E\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE\u1AAF\u1ABF-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C89-\u1C8F\u1CBB\u1CBC\u1CC8-\u1CCF\u1CFA-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20C0-\u20CF\u20F1-\u20FF\u218C-\u218F\u2427-\u243F\u244B-\u245F\u2B74\u2B75\u2B96\u2B97\u2BC9\u2BFF\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E4F-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u3130\u318F\u31BB-\u31BF\u31E4-\u31EF\u321F\u32FF\u4DB6-\u4DBF\u9FF0-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA6F8-\uA6FF\uA7BA-\uA7F6\uA82C-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C6-\uA8CD\uA8DA-\uA8DF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB66-\uAB6F\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF]/g; // eslint-disable-line no-control-regex
            return str.replace(invisibleLetters, '');
        };

        base = removeInvisibleUnicode(base);

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

            match = /^([a-z0-9_.]+)\s+(asc|desc)$/i.exec(rule.trim());

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

            const nql = require('@nexes/nql');
            const modelName = options.modelName;
            const tableNames = {
                Post: 'posts',
                User: 'users',
                Tag: 'tags'
            };
            const exclude = options.exclude;
            const filter = options.filter;
            const shouldHavePosts = options.shouldHavePosts;
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

            // @NOTE: We can't use the filter plugin, because we are not using bookshelf.
            nql(filter).querySQL(query);

            if (shouldHavePosts) {
                require('../plugins/has-posts').addHasPostsWhere(tableNames[modelName], shouldHavePosts)(query);
            }

            if (options.id) {
                query.where({id: options.id});
            }

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
