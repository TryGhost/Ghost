const util = require('util');
const _ = require('lodash');
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

const EXPANSIONS = [{
    key: 'primary_tag',
    replacement: 'tags.slug',
    expand: (mongoJSON) => {
        return {$and: [
            mongoJSON,
            {'posts_tags.sort_order': 0},
            {'tags.visibility': 'public'}
        ]};
    }
}, {
    key: 'primary_author',
    replacement: 'users.slug',
    expand: (mongoJSON) => {
        return {$and: [
            mongoJSON,
            {'posts_authors.sort_order': 0},
            {'users.visibility': 'public'}
        ]};
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
const GROUPS = ['$and', '$or'];
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
                if (_.isObject(value)) {
                    return filterUtils.findStatement(value, match);
                } else {
                    return (key === match);
                }
            }
        });
    },

    /**
     * ## Reject statements
     *
     * Removes statements keys when matching `func` returns true
     * in the primary filter, e.g.:
     *
     * In NQL results equivalent to:
     * ('featured:true', 'featured:false') => ''
     * ('featured:true', 'featured:false,status:published') => 'status:published'
     */
    rejectStatements: (statements, func) => {
        if (!statements) {
            return statements;
        }

        GROUPS.forEach((group) => {
            if (_.has(statements, group)) {
                statements[group] = filterUtils.rejectStatements(statements[group], func);

                if (statements[group].length === 0) {
                    delete statements[group];
                }
            }
        });

        if (_.isArray(statements)) {
            statements = statements
                .map((statement) => {
                    return filterUtils.rejectStatements(statement, func);
                })
                .filter((statement) => {
                    return !(_.isEmpty(statement));
                });
        } else {
            Object.keys(statements).forEach((key) => {
                if (!GROUPS.includes(key) && func(key)) {
                    delete statements[key];
                }
            });
        }

        return statements;
    },

    /**
     * ## Merge Filters
     * Util to combine enforced, default and custom filters based on
     * following hierarchy: enforced -> (custom + extra) -> defaults
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

            custom = filterUtils.rejectStatements(custom, (statement) => {
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

            defaults = filterUtils.rejectStatements(defaults, (statement) => {
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
     * ## Expand Filters
     * Util that expands Mongo JSON statements with custom statements
     */
    expandFilters: (statements, expansions) => {
        let processed = {};

        Object.keys(statements).forEach((key) => {
            if (GROUPS.includes(key)) {
                processed[key] = statements[key]
                    .map(statement => filterUtils.expandFilters(statement, expansions));
            } else {
                const expansion = _.find(expansions, {key});

                if (expansion) {
                    let replaced = {};
                    replaced[expansion.replacement] = statements[key];

                    if (expansion.expand) {
                        replaced = expansion.expand(replaced);
                    }

                    processed - _.merge(processed, replaced);
                } else {
                    processed = _.merge(processed, _.pick(statements, key));
                }
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

            const expandedFilter = filterUtils.expandFilters(filter, EXPANSIONS);

            if (expandedFilter !== filter) {
                debug('processed filter', expandedFilter);
            }

            if (filter) {
                this.query((qb) => {
                    // @TODO: change NQL api to accept mongo json instead of nql string
                    nql(expandedFilter, RELATIONS).querySQL(qb);
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
