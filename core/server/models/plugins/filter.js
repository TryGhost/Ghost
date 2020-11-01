const debug = require('ghost-ignition').debug('models:plugins:filter');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');

const RELATIONS = {
    tags: {
        tableName: 'tags',
        type: 'manyToMany',
        joinTable: 'posts_tags',
        joinFrom: 'post_id',
        joinTo: 'tag_id'
    },
    authors: {
        tableName: 'users',
        tableNameAs: 'authors',
        type: 'manyToMany',
        joinTable: 'posts_authors',
        joinFrom: 'post_id',
        joinTo: 'author_id'
    },
    labels: {
        tableName: 'labels',
        type: 'manyToMany',
        joinTable: 'members_labels',
        joinFrom: 'member_id',
        joinTo: 'label_id'
    },
    posts_meta: {
        tableName: 'posts_meta',
        type: 'oneToOne',
        joinFrom: 'post_id'
    }
};

const EXPANSIONS = {
    posts: [{
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
    }],
    members: [{
        key: 'label',
        replacement: 'labels.slug'
    }, {
        key: 'labels',
        replacement: 'labels.slug'
    }]
};

const filter = function filter(Bookshelf) {
    const Model = Bookshelf.Model.extend({
        // Cached copy of the filters setup for this model instance
        _filters: null,
        // Override these on the various models
        enforcedFilters() {},
        defaultFilters() {},
        extraFilters() {},
        filterExpansions() {},
        /**
         * Method which makes the necessary query builder calls (through knex) for the filters set on this model
         * instance.
         */
        applyDefaultAndCustomFilters: function applyDefaultAndCustomFilters(options) {
            const nql = require('@nexes/nql');

            const expansions = [];

            if (EXPANSIONS[this.tableName]) {
                expansions.push(...EXPANSIONS[this.tableName]);
            }

            if (this.filterExpansions()) {
                expansions.push(...this.filterExpansions());
            }

            let custom = options.filter;
            let extra = this.extraFilters(options);
            let overrides = this.enforcedFilters(options);
            let defaults = this.defaultFilters(options);
            let transformer = options.mongoTransformer;

            debug('custom', custom);
            debug('extra', extra);
            debug('enforced', overrides);
            debug('default', defaults);

            if (extra) {
                if (custom) {
                    custom = `${custom}+${extra}`;
                } else {
                    custom = extra;
                }
            }

            try {
                this.query((qb) => {
                    nql(custom, {
                        relations: RELATIONS,
                        expansions: expansions,
                        overrides: overrides,
                        defaults: defaults,
                        transformer: transformer
                    }).querySQL(qb);
                });
            } catch (err) {
                throw new errors.BadRequestError({
                    message: i18n.t('errors.models.plugins.filter.errorParsing'),
                    err: err
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
