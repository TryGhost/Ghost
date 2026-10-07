const errors = require('@tryghost/errors');

/**
 * Enumerates the routable resources of a type: the rows the URL service would
 * produce a URL for. Computed on demand rather than held in memory.
 *
 * Callers name the extra columns they want back; everything else stays out of
 * memory. The columns URL computation itself needs (permalink fields, filter
 * columns, relations) are passed in by the URL service, which is the source of
 * truth for what the active routing config reads — so rows are never thin for
 * it.
 */

// Which rows of each type are routable. visibility:public alone is not
// enough for tags and authors: without the has-posts join, empty tags and
// staff user accounts would be routable/listable.
const TYPE_CONFIG = {
  posts: {
    modelName: 'Post',
    table: 'posts',
    filter: 'status:published+type:post',
    canCarryRelations: true,
  },
  pages: { modelName: 'Post', table: 'posts', filter: 'status:published+type:page' },
  tags: {
    modelName: 'Tag',
    table: 'tags',
    filter: 'visibility:public',
    shouldHavePosts: { joinTo: 'tag_id', joinTable: 'posts_tags' },
  },
  authors: {
    modelName: 'User',
    table: 'users',
    filter: 'visibility:public',
    shouldHavePosts: { joinTo: 'author_id', joinTable: 'posts_authors' },
  },
};

const RELATION_FIELDS = {
  tags: ['tags.id', 'tags.slug'],
  authors: ['users.id', 'users.slug'],
};

// Keeps each SQLite query under the bound-variable limit (#5810).
const SQLITE_BATCH_SIZE = 999;

/**
 * @param {string} type
 * @param {Object} [options]
 * @param {string[]} [options.columns] - extra columns the caller wants back
 * @param {string[]} [options.requiredFields] - columns URL computation reads
 * @param {string[]} [options.requiredRelations] - relations URL computation
 * reads; ignored for types that carry none
 * @returns {Promise<Object[]>}
 */
async function fetchRoutableResources(
  type,
  { columns = [], requiredFields = [], requiredRelations = [] } = {},
) {
  const typeConfig = TYPE_CONFIG[type];
  if (!typeConfig) {
    throw new errors.IncorrectUsageError({
      message: `Unknown routable resource type: ${type}`,
    });
  }

  // Required here rather than at the top so this module can be loaded
  // for its shape without pulling in the model layer.
  const models = require('../../models');
  const schema = require('../../data/schema');
  const DatabaseInfo = require('@tryghost/database-info');

  // Callers speak include; raw_knex only speaks exclude, so translate
  // against the table schema here, once.
  const include = new Set(['id', ...columns, ...requiredFields]);
  const options = {
    modelName: typeConfig.modelName,
    filter: typeConfig.filter,
    exclude: Object.keys(schema.tables[typeConfig.table]).filter((column) => !include.has(column)),
  };
  if (typeConfig.shouldHavePosts) {
    options.shouldHavePosts = typeConfig.shouldHavePosts;
  }

  // Relations only when the active routing config reads them (e.g.
  // /:primary_tag/:slug/ permalinks, tag-filtered collections), and only for
  // the types that have any — see canCarryRelations above.
  if (typeConfig.canCarryRelations && requiredRelations.length) {
    options.withRelated = requiredRelations;
    options.withRelatedFields = {};
    for (const relation of requiredRelations) {
      options.withRelatedFields[relation] = RELATION_FIELDS[relation];
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
      batch = await models.Base.Model.raw_knex.fetchAll({
        ...options,
        orderBy: 'id',
        offset,
        limit: SQLITE_BATCH_SIZE,
      });
      rows.push(...batch);
      offset += SQLITE_BATCH_SIZE;
    } while (batch.length);
  }

  return rows;
}

module.exports = { fetchRoutableResources };
