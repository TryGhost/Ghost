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
    expansion: 'posts_tags.sort_order:0+tags.visibility:public'
}, {
    key: 'primary_author',
    replacement: 'authors.slug',
    expansion: 'posts_authors.sort_order:0+authors.visibility:public'
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

            let custom = options.filter;
            let extra = this.extraFilters(options);
            let overrides = this.enforcedFilters(options);
            let defaults = this.defaultFilters(options);

            debug('custom', custom);
            debug('extra', extra);
            debug('enforced', overrides);
            debug('default', defaults);

            if (extra) {
                custom = `${custom}+${extra}`;
            }

            if (custom) {
                this.query((qb) => {
                    nql(custom, {
                        relations: RELATIONS,
                        expansions: EXPANSIONS,
                        overrides: overrides,
                        defaults: defaults
                    }).querySQL(qb);
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
