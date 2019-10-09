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
    schema = require('../../data/schema'),
    urlUtils = require('../../lib/url-utils'),
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

        self.on('fetched', self.onFetched);
        self.on('fetching', self.onFetching);
        self.on('fetched:collection', self.onFetchedCollection);
        self.on('fetching:collection', self.onFetchingCollection);
        self.on('creating', self.onCreating);
        self.on('created', self.onCreated);
        self.on('updating', self.onUpdating);
        self.on('updated', self.onUpdated);
        self.on('destroying', self.onDestroying);
        self.on('destroyed', self.onDestroyed);
        self.on('saving', self.onSaving);
        self.on('saved', self.onSaved);

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

    onFetched() {},

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

    onFetchedCollection() {},

    onFetchingCollection: function onFetchingCollection(model, columns, options) {
        if (options.forUpdate && options.transacting) {
            options.query.forUpdate();
        }
    },

    onCreated(model, attrs, options) {
        addAction(model, 'added', options);
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
    onCreating: function onCreating(model, attr, options) {
        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_by')) {
            if (!options.importing || (options.importing && !this.get('created_by'))) {
                this.set('created_by', String(this.contextUser(options)));
            }
        }

        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_by')) {
            if (!options.importing) {
                this.set('updated_by', String(this.contextUser(options)));
            }
        }

        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_at')) {
            if (!model.get('created_at')) {
                model.set('created_at', new Date());
            }
        }

        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_at')) {
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

    onUpdated(model, attrs, options) {
        addAction(model, 'edited', options);
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

        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_by')) {
            if (!options.importing && !options.migrating) {
                this.set('updated_by', String(this.contextUser(options)));
            }
        }

        if (options && options.context && !options.context.internal && !options.importing) {
            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_at')) {
                if (model.hasDateChanged('created_at', {beforeWrite: true})) {
                    model.set('created_at', this.previous('created_at'));
                }
            }

            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_by')) {
                if (model.hasChanged('created_by')) {
                    model.set('created_by', String(this.previous('created_by')));
                }
            }
        }

        // CASE: do not allow setting only the `updated_at` field, exception: importing
        if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_at') && !options.importing) {
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

    onSaved() {},

    onSaving: function onSaving() {
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
    },

    onDestroying() {},

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

    /**
     * before we insert dates into the database, we have to normalize
     * date format is now in each db the same
     */
    fixDatesWhenSave: function fixDates(attrs) {
        var self = this;

        _.each(attrs, function each(value, key) {
            if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
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
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
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
            if (Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
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

        /**
         * removes null relations coming from `hasOne` - https://bookshelfjs.org/api.html#Model-instance-hasOne
         * Based on https://github.com/bookshelf/bookshelf/issues/72#issuecomment-25164617
         */
        _.each(this.relations, (value, key) => {
            if (_.isEmpty(value)) {
                delete this.relations[key];
            }
        });
        // CASE: get JSON of previous attrs
        if (options.previous) {
            const clonedModel = _.cloneDeep(this);
            clonedModel.attributes = this._previousAttributes;

            if (this.relationships) {
                this.relationships.forEach((relation) => {
                    if (this._previousRelations && Object.prototype.hasOwnProperty.call(this._previousRelations, relation)) {
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
            return baseOptions.concat(extraOptions, ['columns', 'require', 'mongoTransformer']);
        case 'findAll':
            return baseOptions.concat(extraOptions, ['filter', 'columns', 'mongoTransformer']);
        case 'findPage':
            return baseOptions.concat(extraOptions, ['filter', 'order', 'page', 'limit', 'columns', 'mongoTransformer']);
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
                && Object.prototype.hasOwnProperty.call(schema.tables[tableName], property)
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
                let relations = data[property];

                // CASE: 1:1 relation will have single data point
                if (!_.isArray(data[property])) {
                    relations = [data[property]];
                }
                _.each(relations, (relation, indexInArr) => {
                    _.each(relation, (value, relationProperty) => {
                        if (value !== null
                            && Object.prototype.hasOwnProperty.call(schema.tables[this.prototype.relationshipBelongsTo[property]], relationProperty)
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

        if (Object.prototype.hasOwnProperty.call(unfilteredOptions, 'include')) {
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
        const slugList = _.union(config.get('slugs').reserved, urlUtils.getProtectedSlugs());
        slug = _.includes(slugList, slug) ? slug + '-' + baseName : slug;

        // if slug is empty after trimming use the model name
        if (!slug) {
            slug = baseName;
        }

        // Test for duplicate slugs.
        return checkIfSlugExists(slug);
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
