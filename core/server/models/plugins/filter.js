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
    filter: 'posts_tags.sort_order:0+visibility:public'
}, {
    key: 'primary_author',
    replacement: 'users.slug',
    filter: 'posts_authors.sort_order:0+visibility:public'
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
     * ## Process Filters
     * Util that substitutes aliases and expands expressions with custom filters
     *
     */
    processFilters: (filter, aliases) => {
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

            const custom = options.filter;
            const defaults = this.defaultFilters(options);
            const enforced = this.enforcedFilters(options);
            const extra = this.extraFilters(options);

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
