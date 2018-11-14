const _ = require('lodash');
const gql = require('ghost-gql');
const nql = require('@nexes/nql');
const debug = require('ghost-ignition').debug('models:plugins:filter');
const common = require('../../lib/common');

let filter;
let filterUtils;

filterUtils = {
    /**
     * ## Get filter keys
     *
     * Returns keys used in a query string, e.g.:
     *
     * ('featured:true') => ['featured:']
     * ('page:false+status:published') => ['page:', 'status:']
     */
    getFilterKeys: (query) => {
        const tokens = nql(query).lex();

        return tokens
            .filter(t => t.token === 'PROP')
            .map(t => t.matched);
    },

    /**
     * ## Reduce filters
     *
     * Removes filter keys from secondary filter if they are present
     * in the primary filter, e.g.:
     *
     * ('featured:true', 'featured:false') => ''
     * ('featured:true', 'featured:false,status:published') => 'status:published'
     */
    reduceFilters: (primary, secondary) => {
        if (!primary || !secondary) {
            return secondary;
        }

        const primaryKeys = filterUtils.getFilterKeys(primary);
        let reducedFilter = secondary;

        primaryKeys.forEach((key) => {
            if (reducedFilter.match(key)) {
                // matches:
                // - 'key:customFilter'
                // - 'key:customFilter,'
                // - 'key:customFilter+'
                const replace = `${key}\\w*(\\,|\\+)?`;
                const re = new RegExp(replace,'g');
                reducedFilter = reducedFilter.replace(re, '');
            }
        });

        const conjunctionEnding = /(,|\+)$/;
        return reducedFilter.replace(conjunctionEnding, '');
    },

    /**
     * ## Merge Filters
     * Util to combine the enforced, default and custom filters such that they behave accordingly
     *
     * enforced - filters which must ALWAYS be applied
     * defaults - filters which must be applied if a matching filter isn't provided
     * custom - custom filters which are additional
     * extra - filters coming from model filter aliases
     */
    mergeFilters: ({enforced, defaults, custom, extra} = {}) => {
        if (extra) {
            // NOTE: check if custom and extra are treated as 'and'?
            if (custom) {
                custom += `+${extra}`;
            } else {
                custom = extra;
            }
        }

        if (custom && !enforced && !defaults) {
            return custom;
        }

        let merged = '';

        if (enforced) {
            merged += enforced;
        }

        if (custom) {
            custom = filterUtils.reduceFilters(merged, custom);

            if (custom) {
                merged = merged ? `${merged}+${custom}` : custom;
            }
        }

        if (defaults) {
            defaults = filterUtils.reduceFilters(merged, defaults);

            if (defaults) {
                merged = merged ? `${merged}+${defaults}` : defaults;
            }
        }

        return merged;
    },

    /**
     * ## Combine Filters
     * Util to combine the enforced, default and custom filters such that they behave accordingly
     * @param {String|Object} enforced - filters which must ALWAYS be applied
     * @param {String|Object} defaults - filters which must be applied if a matching filter isn't provided
     * @param {...String|Object} [custom] - custom filters which are additional
     * @returns {*}
     */
    combineFilters: function combineFilters(enforced, defaults, custom /* ...custom */) {
        custom = Array.prototype.slice.call(arguments, 2);

        // Ensure everything has been run through the gql parser
        try {
            enforced = enforced ? (_.isString(enforced) ? gql.parse(enforced) : enforced) : null;
            defaults = defaults ? (_.isString(defaults) ? gql.parse(defaults) : defaults) : null;
            custom = _.map(custom, function (arg) {
                return _.isString(arg) ? gql.parse(arg) : arg;
            });
        } catch (err) {
            throw new common.errors.ValidationError({
                err: err,
                property: 'filter',
                context: common.i18n.t('errors.models.plugins.filter.errorParsing'),
                help: common.i18n.t('errors.models.plugins.filter.forInformationRead', {url: 'https://api.ghost.org/docs/filter'})
            });
        }

        // Merge custom filter options into a single set of statements
        custom = gql.json.mergeStatements.apply(this, custom);

        // if there is no enforced or default statements, return just the custom statements;
        if (!enforced && !defaults) {
            return custom;
        }

        // Reduce custom filters based on enforced filters
        if (custom && !_.isEmpty(custom.statements) && enforced && !_.isEmpty(enforced.statements)) {
            custom.statements = gql.json.rejectStatements(custom.statements, function (customStatement) {
                return gql.json.findStatement(enforced.statements, customStatement, 'prop');
            });
        }

        // Reduce default filters based on custom filters
        if (defaults && !_.isEmpty(defaults.statements) && custom && !_.isEmpty(custom.statements)) {
            defaults.statements = gql.json.rejectStatements(defaults.statements, function (defaultStatement) {
                return gql.json.findStatement(custom.statements, defaultStatement, 'prop');
            });
        }

        // Merge enforced and defaults
        enforced = gql.json.mergeStatements(enforced, defaults);

        if (_.isEmpty(custom.statements)) {
            return enforced;
        }

        if (_.isEmpty(enforced.statements)) {
            return custom;
        }

        return {
            statements: [
                {group: enforced.statements},
                {group: custom.statements, func: 'and'}
            ]
        };
    }
};

filter = function filter(Bookshelf) {
    var Model = Bookshelf.Model.extend({
        // Cached copy of the filters setup for this model instance
        _filters: null,
        // Override these on the various models
        enforcedFilters: function enforcedFilters() {
        },
        defaultFilters: function defaultFilters() {
        },
        extraFilters: function extraFilters() {
        },

        preProcessFilters: function preProcessFilters() {
            this._filters.statements = gql.json.replaceStatements(this._filters.statements, {prop: /primary_tag/}, function (statement) {
                statement.prop = 'tags.slug';
                return {
                    group: [
                        statement,
                        {prop: 'posts_tags.sort_order', op: '=', value: 0},
                        {prop: 'tags.visibility', op: '=', value: 'public'}
                    ]
                };
            });

            this._filters.statements = gql.json.replaceStatements(this._filters.statements, {prop: /primary_author/}, function (statement) {
                statement.prop = 'authors.slug';
                return {
                    group: [
                        statement,
                        {prop: 'posts_authors.sort_order', op: '=', value: 0},
                        {prop: 'authors.visibility', op: '=', value: 'public'}
                    ]
                };
            });
        },

        /**
         * ## Post process Filters
         * Post Process filters looking for joins etc
         * @TODO refactor this
         * @param {object} options
         */
        postProcessFilters: function postProcessFilters(options) {
            var joinTables = this._filters.joins;

            if (joinTables && joinTables.indexOf('tags') > -1) {
                // We need to use leftOuterJoin to insure we still include posts which don't have tags in the result
                // The where clause should restrict which items are returned
                this
                    .query('leftOuterJoin', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                    .query('leftOuterJoin', 'tags', 'posts_tags.tag_id', '=', 'tags.id');

                // We need to add a group by to counter the double left outer join
                // TODO improve on the group by handling
                options.groups = options.groups || [];
                options.groups.push('posts.id');
            }

            if (joinTables && joinTables.indexOf('authors') > -1) {
                // We need to use leftOuterJoin to insure we still include posts which don't have tags in the result
                // The where clause should restrict which items are returned
                this
                    .query('leftOuterJoin', 'posts_authors', 'posts_authors.post_id', '=', 'posts.id')
                    .query('leftOuterJoin', 'users as authors', 'posts_authors.author_id', '=', 'authors.id');

                // We need to add a group by to counter the double left outer join
                // TODO improve on the group by handling
                options.groups = options.groups || [];
                options.groups.push('posts.id');
            }

            /**
             * @deprecated: `author`, will be removed in Ghost 3.0
             */
            if (joinTables && joinTables.indexOf('author') > -1) {
                this
                    .query('join', 'users as author', 'author.id', '=', 'posts.author_id');
            }
        },

        /**
         * ## fetchAndCombineFilters
         * Helper method, uses the combineFilters util to apply filters to the current model instance
         * based on options and the set enforced/default filters for this resource
         * @param {Object} options
         * @returns {Bookshelf.Model}
         */
        fetchAndCombineFilters: function fetchAndCombineFilters(options) {
            options = options || {};

            this._filters = filterUtils.combineFilters(
                this.enforcedFilters(options),
                this.defaultFilters(options),
                options.filter,
                this.extraFilters(options)
            );

            return this;
        },

        /**
         * Method which makes the necessary query builder calls (through knex) for the filters set on this model
         * instance.
         */
        applyDefaultAndCustomFilters: function applyDefaultAndCustomFilters(options) {
            const nql = require('@nexes/nql');

            const customFilter = options.filter;
            const defaultFilters = this.enforcedFilters(options);
            const enforcedFilters = this.enforcedFilters(options);

            debug('custom', customFilter);
            debug('default', defaultFilters);
            debug('enforced', enforcedFilters);

            if (customFilter) {
                this.query((qb) => {
                    nql(customFilter, {relations: {tags: {
                        tableName: 'tags',
                        type: 'manyToMany',
                        join_table: 'posts_tags',
                        join_from: 'post_id',
                        join_to: 'tag_id'
                    }}}).querySQL(qb);
                });
            }
        }
    });

    Bookshelf.Model = Model;
};

/**
 * ## Export Filter plugin
 * @api public
 */
module.exports = filter;
