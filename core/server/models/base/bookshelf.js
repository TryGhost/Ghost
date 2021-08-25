const _ = require('lodash');
const bookshelf = require('bookshelf');
const ObjectId = require('bson-objectid');
const plugins = require('@tryghost/bookshelf-plugins');
const Promise = require('bluebird');

const db = require('../../data/db');

// ### ghostBookshelf
// Initializes a new Bookshelf instance called ghostBookshelf, for reference elsewhere in Ghost.
const ghostBookshelf = bookshelf(db.knex);

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

ghostBookshelf.plugin(require('./plugins/user-type'));

ghostBookshelf.plugin(require('./plugins/data-manipulation'));

ghostBookshelf.plugin(require('./plugins/overrides'));

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
                const queryOptions = {
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
                data.id = ObjectId().toHexString();
            }
        }
    }
});

module.exports = ghostBookshelf;
