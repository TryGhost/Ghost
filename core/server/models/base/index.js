// # Base Model
// This is the model from which all other Ghost models extend. The model is based on Bookshelf.Model, and provides
// several basic behaviours such as UUIDs, as well as a set of Data methods for accessing information from the database.
//
// The models are internal to Ghost, only the API and some internal functions such as migration and import/export
// accesses the models directly.

// All other parts of Ghost, including the frontend & admin UI are only allowed to access data via the API.
const _ = require('lodash');

const moment = require('moment');
const ObjectId = require('bson-objectid');
const errors = require('@tryghost/errors');
const schema = require('../../data/schema');
const bulkOperations = require('./bulk-operations');
const tpl = require('@tryghost/tpl');

const ghostBookshelf = require('./bookshelf');

const messages = {
    missingContext: 'missing context'
};

let proto;

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

    // Ghost ordering handling, allows to order by permitted attributes by default and can be overriden on specific model level
    orderAttributes: function orderAttributes() {
        return Object.keys(schema.tables[this.tableName])
            .map(key => `${this.tableName}.${key}`)
            .filter(key => key.indexOf('@@') === -1);
    },

    // When loading an instance, subclasses can specify default to fetch
    defaultColumnsToFetch: function defaultColumnsToFetch() {
        return [];
    },

    // Bookshelf `initialize` - declare a constructor-like method for model creation
    initialize: function initialize() {
        this.initializeEvents();

        // @NOTE: Please keep here. If we don't initialize the parent, bookshelf-relations won't work.
        proto.initialize.call(this);
    },

    /**
     * Bookshelf's .format() is run when fetching as well as saving.
     * We need a way to transform attributes only on save so we override
     * .sync() which is run on every database operation where we can
     * run any transforms needed only on insert and update operations
     */
    sync: function sync() {
        const parentSync = proto.sync.apply(this, arguments);
        const originalUpdateSync = parentSync.update;
        const originalInsertSync = parentSync.insert;
        const self = this;

        // deep clone attrs to avoid modifying underlying model attributes by reference
        parentSync.update = function update(attrs) {
            attrs = self.formatOnWrite(_.cloneDeep(attrs));
            return originalUpdateSync.apply(this, [attrs]);
        };

        parentSync.insert = function insert(attrs) {
            attrs = self.formatOnWrite(_.cloneDeep(attrs));
            return originalInsertSync.apply(this, [attrs]);
        };

        return parentSync;
    },

    /**
     * before we insert dates into the database, we have to normalize
     * date format is now in each db the same
     */
    fixDatesWhenSave: function fixDates(attrs) {
        const self = this;

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
        const self = this;
        let dateMoment;

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
        const self = this;
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
            throw new errors.NotFoundError({
                message: tpl(messages.missingContext),
                level: 'critical'
            });
        }
    },

    // format date before writing to DB, bools work
    format: function format(attrs) {
        return this.fixDatesWhenSave(attrs);
    },

    // overridable function for models to format attrs only when saving to db
    formatOnWrite: function formatOnWrite(attrs) {
        return attrs;
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
        this.set('id', ObjectId().toHexString());
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

    // ## Model Data Functions

    getFilteredCollection: function getFilteredCollection(options) {
        const filteredCollection = this.forge();

        // Apply model-specific query behaviour
        filteredCollection.applyCustomQuery(options);

        // Add Filter behaviour
        filteredCollection.applyDefaultAndCustomFilters(options);

        // Apply model-specific search behaviour
        filteredCollection.applySearchQuery(options);

        return filteredCollection;
    },

    getFilteredCollectionQuery: function getFilteredCollectionQuery(options) {
        const filteredCollection = this.getFilteredCollection(options);
        const filteredCollectionQuery = filteredCollection.query();

        if (options.transacting) {
            filteredCollectionQuery.transacting(options.transacting);
            if (options.forUpdate) {
                filteredCollectionQuery.forUpdate();
            }
        }

        return filteredCollectionQuery;
    },

    bulkAdd: function bulkAdd(data, tableName) {
        tableName = tableName || this.prototype.tableName;

        return bulkOperations.insert(tableName, data);
    },

    bulkDestroy: function bulkDestroy(data, tableName) {
        tableName = tableName || this.prototype.tableName;

        return bulkOperations.del(tableName, data);
    }
});

// Export ghostBookshelf for use elsewhere
module.exports = ghostBookshelf;
