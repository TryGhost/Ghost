// # Pagination
//
// Extends Bookshelf.Model with a `fetchPage` method. Handles everything to do with paginated requests.
const _ = require('lodash');

const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
let defaults;
let paginationUtils;

/**
 * ### Default pagination values
 * These are overridden via `options` passed to each function
 * @typedef {Object} defaults
 * @default
 * @property {Number} `page` \- page in set to display (default: 1)
 * @property {Number|String} `limit` \- no. results per page (default: 15)
 */
defaults = {
    page: 1,
    limit: 15
};

/**
 * ## Pagination Utils
 * @api private
 * @type {{parseOptions: Function, query: Function, formatResponse: Function}}
 */
paginationUtils = {
    /**
     * ### Parse Options
     * Take the given options and ensure they are valid pagination options, else use the defaults
     * @param {options} options
     * @returns {options} options sanitised for pagination
     */
    parseOptions: function parseOptions(options) {
        options = _.defaults(options || {}, defaults);

        if (options.limit !== 'all') {
            options.limit = parseInt(options.limit, 10) || defaults.limit;
        }

        options.page = parseInt(options.page, 10) || defaults.page;

        return options;
    },
    /**
     * ### Query
     * Apply the necessary parameters to paginate the query
     * @param {bookshelf.Model} model
     * @param {options} options
     */
    addLimitAndOffset: function addLimitAndOffset(model, options) {
        if (_.isNumber(options.limit)) {
            model
                .query('limit', options.limit)
                .query('offset', options.limit * (options.page - 1));
        }
    },

    /**
     * ### Format Response
     * Takes the no. items returned and original options and calculates all of the pagination meta data
     * @param {Number} totalItems
     * @param {options} options
     * @returns {pagination} pagination metadata
     */
    formatResponse: function formatResponse(totalItems, options) {
        const calcPages = Math.ceil(totalItems / options.limit) || 0;

        const pagination = {
            page: options.page || defaults.page,
            limit: options.limit,
            pages: calcPages === 0 ? 1 : calcPages,
            total: totalItems,
            next: null,
            prev: null
        };

        if (pagination.pages > 1) {
            if (pagination.page === 1) {
                pagination.next = pagination.page + 1;
            } else if (pagination.page === pagination.pages) {
                pagination.prev = pagination.page - 1;
            } else {
                pagination.next = pagination.page + 1;
                pagination.prev = pagination.page - 1;
            }
        }

        return pagination;
    },

    /**
     *
     * @param {Bookshelf.Model} model instance of Bookshelf model
     * @param {string} propertyName property to be inspected and included in the relation
     */
    handleRelation: function handleRelation(model, propertyName) {
        const tableName = _.result(model.constructor.prototype, 'tableName');

        const targetTable = propertyName.includes('.') && propertyName.split('.')[0];

        if (targetTable && targetTable !== tableName) {
            if (!model.eagerLoad) {
                model.eagerLoad = [];
            }

            if (!model.eagerLoad.includes(targetTable)) {
                model.eagerLoad.push(targetTable);
            }
        }
    }
};

// ## Object Definitions

/**
 * ### Pagination Object
 * @typedef {Object} pagination
 * @property {Number} page \- page in set to display
 * @property {Number|String} limit \- no. results per page, or 'all'
 * @property {Number} pages \- total no. pages in the full set
 * @property {Number} total \- total no. items in the full set
 * @property {Number|null} next \- next page
 * @property {Number|null} prev \- previous page
 */

/**
 * ### Fetch Page Options
 * @typedef {Object} options
 * @property {Number} page \- page in set to display
 * @property {Number|String} limit \- no. results per page, or 'all'
 * @property {Object} order \- set of order by params and directions
 */

/**
 * ### Fetch Page Response
 * @typedef {Object} paginatedResult
 * @property {Array} collection \- set of results
 * @property {pagination} pagination \- pagination metadata
 */

/**
 * ## Pagination
 * Extends `bookshelf.Model` with `fetchPage`
 * @param {Bookshelf} bookshelf \- the instance to plug into
 */
const pagination = function pagination(bookshelf) {
    // Extend updates the first object passed to it, no need for an assignment
    _.extend(bookshelf.Model.prototype, {
        /**
         * ### Fetch page
         * A `fetch` extension to get a paginated set of items from a collection
         *
         * We trigger two queries:
         * 1. count query to know how many pages left (important: we don't attach any group/order statements!)
         * 2. the actualy fetch query with limit and page property
         *
         * @param {options} options
         * @returns {paginatedResult} set of results + pagination metadata
         */
        fetchPage: function fetchPage(options) {
            // Setup pagination options
            options = paginationUtils.parseOptions(options);

            // Get the table name and idAttribute for this model
            const tableName = _.result(this.constructor.prototype, 'tableName');

            const idAttribute = _.result(this.constructor.prototype, 'idAttribute');
            const self = this;

            // #### Pre count clauses
            // Add any where or join clauses which need to be included with the aggregate query

            // Clone the base query & set up a promise to get the count of total items in the full set
            // Necessary due to lack of support for `count distinct` in bookshelf's count()
            // Skipped if limit='all' as we can use the length of the fetched data set
            let countPromise = Promise.resolve();
            if (options.limit !== 'all') {
                const countQuery = this.query().clone();

                if (options.transacting) {
                    countQuery.transacting(options.transacting);
                }

                countPromise = countQuery.select(
                    bookshelf.knex.raw('count(distinct ' + tableName + '.' + idAttribute + ') as aggregate')
                );
            }

            return countPromise.then(function (countResult) {
                // #### Post count clauses
                // Add any where or join clauses which need to NOT be included with the aggregate query

                // Setup the pagination parameters so that we return the correct items from the set
                paginationUtils.addLimitAndOffset(self, options);

                // Apply ordering options if they are present
                if (options.order && !_.isEmpty(options.order)) {
                    _.forOwn(options.order, function (direction, property) {
                        if (property === 'count.posts') {
                            self.query('orderBy', 'count__posts', direction);
                        } else {
                            self.query('orderBy', property, direction);

                            paginationUtils.handleRelation(self, property);
                        }
                    });
                }

                if (options.orderRaw) {
                    self.query((qb) => {
                        qb.orderByRaw(options.orderRaw);
                    });
                }

                if (!_.isEmpty(options.eagerLoad)) {
                    options.eagerLoad.forEach(property => paginationUtils.handleRelation(self, property));
                }

                if (options.groups && !_.isEmpty(options.groups)) {
                    _.each(options.groups, function (group) {
                        self.query('groupBy', group);
                    });
                }

                // Setup the promise to do a fetch on our collection, running the specified query
                // @TODO: ensure option handling is done using an explicit pick elsewhere

                return self.fetchAll(_.omit(options, ['page', 'limit']))
                    .then(function (fetchResult) {
                        if (options.limit === 'all') {
                            countResult = [{aggregate: fetchResult.length}];
                        }

                        return {
                            collection: fetchResult,
                            pagination: paginationUtils.formatResponse(countResult[0] ? countResult[0].aggregate : 0, options)
                        };
                    })
                    .catch(function (err) {
                        // e.g. offset/limit reached max allowed integer value
                        if (err.errno === 20 || err.errno === 1064) {
                            throw new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')});
                        }

                        throw err;
                    });
            }).catch((err) => {
                // CASE: SQL syntax is incorrect
                if (err.errno === 1054 || err.errno === 1) {
                    throw new errors.BadRequestError({
                        message: i18n.t('errors.models.general.sql'),
                        err: err
                    });
                }

                throw err;
            });
        }
    });
};

/**
 * ## Export pagination plugin
 * @api public
 */
module.exports = pagination;
