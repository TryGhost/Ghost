const _ = require('lodash');
const errors = require('@tryghost/errors');

const tpl = require('@tryghost/tpl');

const messages = {
    couldNotUnderstandRequest: 'Could not understand request.'
};

/**
 * @param {Bookshelf} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        // When loading an instance, subclasses can specify default to fetch
        defaultColumnsToFetch: function defaultColumnsToFetch() {
            return [];
        }
    }, {
        /**
         * ### Find All
         * Fetches all the data for a particular model
         * @param {Object} [unfilteredOptions]
         * @return {Promise<Bookshelf['Collection']>} Collection of all Models
         */
        findAll: async function findAll(unfilteredOptions) {
            const options = this.filterOptions(unfilteredOptions, 'findAll');
            const itemCollection = this.getFilteredCollection(options);

            // @TODO: we can't use order raw when running migrations (see https://github.com/tgriesser/knex/issues/2763)
            if (this.orderDefaultRaw && !options.migrating) {
                itemCollection.query((qb) => {
                    qb.orderByRaw(this.orderDefaultRaw(options));
                });
            }

            const result = await itemCollection.fetchAll(options);
            if (options.withRelated) {
                _.each(result.models, function each(item) {
                    item.withRelated = options.withRelated;
                });
            }

            return result;
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
        findPage: async function findPage(unfilteredOptions) {
            const options = this.filterOptions(unfilteredOptions, 'findPage');
            const itemCollection = this.getFilteredCollection(options);
            const requestedColumns = options.columns;

            // Set this to true or pass ?debug=true as an API option to get output
            itemCollection.debug = unfilteredOptions.debug && process.env.NODE_ENV !== 'production';

            // Ensure only valid fields/columns are added to query
            // and append default columns to fetch
            if (options.columns) {
                options.columns = _.intersection(options.columns, this.prototype.permittedAttributes());
                options.columns = _.union(options.columns, this.prototype.defaultColumnsToFetch());
            }

            if (options.order) {
                const {order, orderRaw, eagerLoad} = itemCollection.parseOrderOption(options.order, options.withRelated);
                options.orderRaw = orderRaw;
                options.order = order;
                options.eagerLoad = eagerLoad;
            } else if (options.autoOrder) {
                options.orderRaw = options.autoOrder;
            } else if (this.orderDefaultRaw) {
                options.orderRaw = this.orderDefaultRaw(options);
            } else if (this.orderDefaultOptions) {
                options.order = this.orderDefaultOptions();
            }

            const response = await itemCollection.fetchPage(options);
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
        },

        /**
         * ### Find One
         * Naive find one where data determines what to match on
         * @param {Object} data
         * @param {Object} [unfilteredOptions]
         * @return {Promise<Bookshelf['Model']>} Single Model
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

            if (options.transacting && options.forUpdate) {
                options.lock = 'forUpdate';
            }

            return model.fetch(options)
                .catch((err) => {
                    // CASE: SQL syntax is incorrect
                    if (err.errno === 1054 || err.errno === 1) {
                        throw new errors.BadRequestError({
                            message: tpl(messages.couldNotUnderstandRequest),
                            err
                        });
                    }

                    throw err;
                });
        },

        /**
         * ### Edit
         * Naive edit
         *
         * We always forward the `method` option to Bookshelf, see http://bookshelfjs.org/#Model-instance-save.
         * Based on the `method` option Bookshelf and Ghost can determine if a query is an insert or an update.
         *
         * @param {Object} data
         * @param {Object} [unfilteredOptions]
         * @return {Promise<Bookshelf['Model']>} Edited Model
         */
        edit: async function edit(data, unfilteredOptions) {
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

            if (options.transacting) {
                options.lock = 'forUpdate';
            }

            const object = await model.fetch(options);
            if (object) {
                options.method = 'update';
                return object.save(data, options);
            }

            throw new errors.NotFoundError();
        },

        /**
         * ### Add
         * Naive add
         * @param {Object} data
         * @param {Object} [unfilteredOptions]
         * @return {Promise<Bookshelf['Model']>} Newly Added Model
         */
        add: function add(data, unfilteredOptions) {
            const options = this.filterOptions(unfilteredOptions, 'add');
            let model;

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
         * @param {Object} [unfilteredOptions]
         * @return {Promise<Bookshelf['Model']>} Empty Model
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
        }
    });
};

/**
 * @typedef {import('bookshelf')} Bookshelf
 */
