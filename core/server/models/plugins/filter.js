const util = require('util');
const _ = require('lodash');
const nql = require('@nexes/nql');
const debug = require('ghost-ignition').debug('models:plugins:filter');

const RELATIONS = {
    relations: {
        tags: {
            tableName: 'tags',
            type: 'manyToMany',
            join_table: 'posts_tags',
            join_from: 'post_id',
            join_to: 'tag_id'
        },
        authors: {
            tableName: 'users',
            tableNameAs: 'authors',
            type: 'manyToMany',
            join_table: 'posts_authors',
            join_from: 'post_id',
            join_to: 'author_id'
        }
    }
};

const ALIASES = [{
    key: 'primary_tag',
    replacement: 'tags.slug',
    filter: {
        $and: [{
            'posts_tags.sort_order': 0
        }, {
            'tags.visibility': 'public'
        }]
    }
}, {
    key: 'primary_author',
    replacement: 'users.slug',
    filter: {
        $and: [{
            'posts_authors.sort_order': 0
        }, {
            'users.visibility': 'public'
        }]
    }
}, {
    key: 'authors',
    replacement: 'authors.slug'
}, {
    key: 'author',
    replacement: 'authors.slug'
}, {
    key: 'tag',
    replacement: 'tags.slug'
}, {
    key: 'tags',
    replacement: 'tags.slug'
}];

// @TODO: The filter utility lives here temporary.
const filterUtils = {
    /**
     * Combines two filters with $and conjunction
     */
    combineFilters: (primary, secondary) => {
        if (_.isEmpty(primary)) {
            return secondary;
        }

        if (_.isEmpty(secondary)) {
            return primary;
        }

        return {
            $and: [primary, secondary]
        };
    },

    findStatement: (statements, match) => {
        return _.some(statements, (value, key, obj) => {
            if (key === '$and') {
                return filterUtils.findStatement(obj.$and, match);
            } else if (key === '$or') {
                return filterUtils.findStatement(obj.$or, match);
            } else {
                if (_.isObject(match)) {
                    return _.has(match, key);
                } else {
                    return key === match;
                }
            }
        });
    },

    /**
     * ## Reject filters
     *
     * Removes filter keys from secondary filter if they are present
     * in the primary filter, e.g.:
     *
     * In NQL results equivalent to:
     * ('featured:true', 'featured:false') => ''
     * ('featured:true', 'featured:false,status:published') => 'status:published'
     */
    rejectFilters: (statements, func) => {
        if (!statements) {
            return statements;
        }

        if (_.has(statements, '$and')) {
            statements.$and = filterUtils.rejectFilters(statements.$and, func);
        }

        if (_.has(statements, '$or')) {
            statements.$or = filterUtils.rejectFilters(statements.$or, func);
        }

        if (_.isArray(statements)) {
            statements = _.reject(statements, (statement) => {
                return func(statement);
            });
        } else {
            // @TODO: could be optimized with a check for keys other than $and/$or
            Object.keys(statements).forEach((key) => {
                if (func(key)) {
                    delete statements[key];
                }
            });
        }

        return statements;
    },

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
    xreduceFilters: (primary, secondary) => {
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
                const replace = `${key}\\s?\\w*(\\,|\\+)?`;
                const re = new RegExp(replace,'g');
                reducedFilter = reducedFilter.replace(re, '');
            }
        });

        const conjunctionEnding = /(,|\+)$/;
        return reducedFilter.replace(conjunctionEnding, '');
    },

    /**
     * ## Merge Filters
     * Util to combine the enforced, default and custom filters such that they behave accordingly.
     * The hierarchy of these filters: enforced -> (custom + extra) -> defaults
     *
     * enforced - filters which must ALWAYS be applied
     * defaults - filters which must be applied if a matching filter isn't provided
     * custom - custom filters which are additional
     * extra - filters coming from model filter aliases
     */
    mergeFilters: ({enforced, defaults, custom, extra} = {}) => {
        if (extra) {
            if (custom) {
                custom = filterUtils.combineFilters(custom, extra);
            } else {
                custom = extra;
            }
        }

        if (custom && !enforced && !defaults) {
            return custom;
        }

        let merged = {};

        if (enforced) {
            merged = enforced;
        }

        if (custom) {
            debug('rejecting custom:', util.inspect(merged), util.inspect(custom));

            custom = filterUtils.rejectFilters(custom, (statement) => {
                debug('statements', util.inspect(merged));
                debug('match', util.inspect(statement));
                return filterUtils.findStatement(merged, statement);
            });

            debug('rejected custom:', util.inspect(custom));

            if (!_.isEmpty(custom)) {
                merged = merged ? filterUtils.combineFilters(merged, custom) : custom;
            }
        }

        if (defaults) {
            debug('rejecting defaults:', util.inspect(merged), util.inspect(defaults));

            defaults = filterUtils.rejectFilters(defaults, (statement) => {
                debug('statements', util.inspect(merged));
                debug('match', util.inspect(statement));
                return filterUtils.findStatement(merged, statement);
            });

            debug('rejected defaults:', util.inspect(defaults));

            if (!_.isEmpty(defaults)) {
                merged = merged ? filterUtils.combineFilters(merged, defaults) : defaults;
            }
        }

        return merged;
    },

    /**
     * ## Process Filters
     * Util that substitutes aliases and expands expressions with custom filters
     */
    processFilters: (filter, aliases) => {
        // @TODO: needs to be replaced with mongo json util
        let processed = filter;

        aliases.forEach((alias) => {
            if (processed.match(`${alias.key}:`)) {
                // matches:
                // - 'key:customFilter'
                // - 'key:-custom-filter'
                // - 'key:[customFilter]'
                // - 'key:[custom,filter]'
                const keyGroupMatch = `${alias.key}:\\s?([a-zA-Z\\-]+|\\[([a-zA-Z\\-]|,)+\\])`;

                const re = new RegExp(keyGroupMatch,'g');
                const matches = processed.match(re);

                matches.forEach((match) => {
                    let replaced = match.replace(alias.key, alias.replacement);

                    if (alias.filter) {
                        // NOTE: we need () grouping here because it makes sure subqueries work
                        // in filters using $or conjunction e.g: '(posts_tags.sort_order:0+tags.slug:cat),tags.visibility:true'
                        // if the grouping wasn't used statements would end up in single $or group (one subquery with single where)
                        // and would return wrong results
                        replaced = `(${replaced}+${alias.filter})`;
                    }

                    processed = processed.replace(match, replaced);
                });
            }
        });

        return processed;
    }
};

const filter = function filter(Bookshelf) {
    const Model = Bookshelf.Model.extend({
        // Cached copy of the filters setup for this model instance
        _filters: null,
        // Override these on the various models
        enforcedFilters() {},
        defaultFilters() {},
        extraFilters() {},

        /**
         * Method which makes the necessary query builder calls (through knex) for the filters set on this model
         * instance.
         */
        applyDefaultAndCustomFilters: function applyDefaultAndCustomFilters(options) {
            const nql = require('@nexes/nql');

            const custom = options.filter ? nql(options.filter).parse() : null;
            const defaults = this.defaultFilters(options) ? nql(this.defaultFilters(options)) : null;
            const enforced = this.enforcedFilters(options) ? nql(this.enforcedFilters(options)) : null;
            const extra = this.extraFilters(options) ? nql(this.extraFilters(options)) : null;

            debug('custom', custom);
            debug('extra', extra);
            debug('default', defaults);
            debug('enforced', enforced);

            const filter = filterUtils.mergeFilters({enforced, defaults, custom, extra});

            debug('filter', filter);

            const processedFilter = filterUtils.processFilters(filter, ALIASES);

            if (processedFilter !== filter) {
                debug('processed filter', processedFilter);
            }

            if (filter) {
                this.query((qb) => {
                    // @TODO: change NQL api to accept mongo json instead of nql string
                    nql(processedFilter, RELATIONS).querySQL(qb);
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
