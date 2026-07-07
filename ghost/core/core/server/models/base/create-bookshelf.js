const _ = require('lodash');
const moment = require('moment');
const bookshelf = require('bookshelf');
const ObjectId = require('bson-objectid').default;
const plugins = require('@tryghost/bookshelf-plugins');

const schema = require('../../data/schema');

/**
 * Builds a Ghost bookshelf instance — plugins plus the base Model — bound to
 * the given knex connection.
 *
 * @param {import('knex').Knex} knex
 */
module.exports = function createBookshelf(knex) {
    const ghostBookshelf = bookshelf(knex);

    ghostBookshelf.plugin(plugins.eagerLoad);

    // Add committed/rollback events.
    ghostBookshelf.plugin(plugins.transactionEvents);

    // Load the Ghost custom-query plugin, which applying a custom query to findPage requests
    ghostBookshelf.plugin(plugins.customQuery);

    // Load the Ghost filter plugin, which handles applying a 'filter' to findPage requests
    ghostBookshelf.plugin(plugins.filter);

    // Load the Ghost filter plugin, which handles applying a 'order' to findPage requests
    ghostBookshelf.plugin(plugins.order);

    // Load the Ghost search plugin, which handles applying a search query to findPage requests
    ghostBookshelf.plugin(plugins.search);

    // Load the Ghost include count plugin, which allows for the inclusion of cross-table counts
    ghostBookshelf.plugin(plugins.includeCount);

    // Load the Ghost pagination plugin, which gives us the `fetchPage` method on Models
    ghostBookshelf.plugin(plugins.pagination);

    // Update collision plugin
    ghostBookshelf.plugin(plugins.collision);

    // Load hasPosts plugin for authors models
    ghostBookshelf.plugin(plugins.hasPosts);

    ghostBookshelf.plugin(require('./plugins/crud'));

    ghostBookshelf.plugin(require('./plugins/actions'));

    ghostBookshelf.plugin(require('./plugins/events'));

    ghostBookshelf.plugin(require('./plugins/raw-knex'));

    ghostBookshelf.plugin(require('./plugins/sanitize'));

    ghostBookshelf.plugin(require('./plugins/generate-slug'));

    ghostBookshelf.plugin(require('./plugins/bulk-operations'));

    ghostBookshelf.plugin(require('./plugins/filtered-collection'));

    ghostBookshelf.plugin(require('./plugins/user-type'), {
        resolveIntegrationUserId: function resolveIntegrationUserId(options) {
            return ghostBookshelf.model('User').getOwnerId(options);
        },
        resolveInternalUserId: function resolveInternalUserId(options) {
            return ghostBookshelf.model('User').getOwnerId(options);
        }
    });

    ghostBookshelf.plugin(require('./plugins/data-manipulation'));

    ghostBookshelf.plugin(require('./plugins/overrides'));

    ghostBookshelf.plugin(require('./plugins/relations'));

    // Manages nested updates (relationships)
    ghostBookshelf.plugin('bookshelf-relations', {
        allowedOptions: ['context', 'importing', 'migrating'],
        unsetRelations: true,
        editRelations: false,
        extendChanged: '_changed',
        attachPreviousRelations: true,
        hooks: {
            belongsToMany: {
                after: function (existing, targets, options) {
                    // reorder tags/authors
                    const queryOptions = {
                        query: {
                            where: {}
                        }
                    };

                    // CASE: disable after hook for specific relations
                    if (['permissions_roles', 'members_newsletters'].indexOf(existing.relatedData.joinTableName) !== -1) {
                        return Promise.resolve();
                    }

                    return Promise.all(targets.models.map((target, index) => {
                        queryOptions.query.where[existing.relatedData.otherKey] = target.id;

                        return existing.updatePivot({
                            sort_order: index
                        }, _.extend({}, options, queryOptions));
                    }));
                },
                beforeRelationCreation: function onCreatingRelation(model, data) {
                    data.id = ObjectId().toHexString();
                }
            }
        }
    });

    // Cache an instance of the base model prototype
    const proto = ghostBookshelf.Model.prototype;

    // ## ghostBookshelf.Model
    // The Base Model which other Ghost objects will inherit from,
    // including some convenience functions as static properties on the model.
    ghostBookshelf.Model = ghostBookshelf.Model.extend({
        // Bookshelf `hasTimestamps` - handles created_at and updated_at properties
        hasTimestamps: true,

        requireFetch: false,

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

        // Bookshelf `initialize` - declare a constructor-like method for model creation
        initialize: function initialize() {
            this.initializeEvents();

            // @NOTE: Please keep here. If we don't initialize the parent, bookshelf-relations won't work.
            proto.initialize.call(this);
        },

        hasDateChanged: function (attr) {
            return moment(this.get(attr)).diff(moment(this.previous(attr))) !== 0;
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
        /**
         * @template T
         * @param {(transaction: import('knex').Transaction) => Promise<T>} fn
         *
         * @returns {Promise<T>}
         */
        transaction(fn) {
            return ghostBookshelf.transaction(fn);
        }
    });

    return ghostBookshelf;
};
