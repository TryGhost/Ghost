const errors = require('@tryghost/errors');

/**
 * Enumerates the routable resources of a type: the rows the lazy URL service
 * would produce a URL for. This is the lazy counterpart of the eager
 * service's boot walk — same raw-knex fast path, same public-visibility
 * gates — computed on demand instead of held in memory.
 *
 * Callers name the extra columns they want back; everything else stays out
 * of memory. The columns URL computation needs (permalink fields, filter
 * columns, relations) come from the lazy service itself, so rows are never
 * thin for the active routing config.
 */

// Which rows of each type are routable. visibility:public alone is not
// enough for tags and authors: without the has-posts join, empty tags and
// staff user accounts would be routable/listable.
const TYPE_CONFIG = {
    posts: {modelName: 'Post', table: 'posts', filter: 'status:published+type:post'},
    pages: {modelName: 'Post', table: 'posts', filter: 'status:published+type:page'},
    tags: {
        modelName: 'Tag',
        table: 'tags',
        filter: 'visibility:public',
        shouldHavePosts: {joinTo: 'tag_id', joinTable: 'posts_tags'}
    },
    authors: {
        modelName: 'User',
        table: 'users',
        filter: 'visibility:public',
        shouldHavePosts: {joinTo: 'author_id', joinTable: 'posts_authors'}
    }
};

const RELATION_FIELDS = {
    tags: ['tags.id', 'tags.slug'],
    authors: ['users.id', 'users.slug']
};

// Keeps each SQLite query under the bound-variable limit (#5810) — the same
// strategy as the eager boot walk (services/url/resources.js).
const SQLITE_BATCH_SIZE = 999;

/**
 * @param {Object} deps
 * @param {Object} deps.lazyUrlService - source of truth for the columns and
 * relations the active routing config reads
 * @returns {(type: string, options?: {columns?: string[]}) => Promise<Object[]>}
 */
function createFetchRoutableResources({lazyUrlService}) {
    if (!lazyUrlService) {
        throw new errors.IncorrectUsageError({
            message: 'fetchRoutableResources requires a lazy URL service backend'
        });
    }

    return async function fetchRoutableResources(type, {columns = []} = {}) {
        const typeConfig = TYPE_CONFIG[type];
        if (!typeConfig) {
            throw new errors.IncorrectUsageError({
                message: `Unknown routable resource type: ${type}`
            });
        }

        // Lazy requires: the model layer must not load before boot wires it.
        const models = require('../../models');
        const schema = require('../../data/schema');
        const DatabaseInfo = require('@tryghost/database-info');

        // Callers speak include; raw_knex only speaks exclude, so translate
        // against the table schema here, once.
        const include = new Set(['id', ...columns, ...lazyUrlService.getRequiredFields(type)]);
        const options = {
            modelName: typeConfig.modelName,
            filter: typeConfig.filter,
            exclude: Object.keys(schema.tables[typeConfig.table]).filter(column => !include.has(column))
        };
        if (typeConfig.shouldHavePosts) {
            options.shouldHavePosts = typeConfig.shouldHavePosts;
        }

        // Relations only when the active routing config reads them (e.g.
        // /:primary_tag/:slug/ permalinks, tag-filtered collections). Pages
        // never carry relations, mirroring the eager resource config.
        if (type === 'posts') {
            const relations = lazyUrlService.getRequiredRelations();
            if (relations.length) {
                options.withRelated = relations;
                options.withRelatedFields = {};
                for (const relation of relations) {
                    options.withRelatedFields[relation] = RELATION_FIELDS[relation];
                }
            }
        }

        let rows;
        if (!DatabaseInfo.isSQLite(models.Base.knex)) {
            rows = await models.Base.Model.raw_knex.fetchAll(options);
        } else {
            rows = [];
            let offset = 0;
            let batch;
            do {
                // orderBy makes the pagination deterministic; without it the
                // row order between batches is unspecified.
                batch = await models.Base.Model.raw_knex.fetchAll({...options, orderBy: 'id', offset, limit: SQLITE_BATCH_SIZE});
                rows.push(...batch);
                offset += SQLITE_BATCH_SIZE;
            } while (batch.length);
        }

        return rows;
    };
}

module.exports = {createFetchRoutableResources};
