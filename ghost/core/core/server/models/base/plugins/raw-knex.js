const debug = require('@tryghost/debug')('models:base:raw-knex');
const plugins = require('@tryghost/bookshelf-plugins');

const schema = require('../../../data/schema');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        /**
         * If you want to fetch all data fast, i recommend using this function.
         * Bookshelf is just too slow, too much ORM overhead.
         *
         * If we e.g. instantiate for each object a model, it takes twice long.
         */
        raw_knex: {
            fetchAll: async function (options = {}) {
                const {
                    modelName,
                    include,
                    filter,
                    shouldHavePosts,
                    withRelated,
                    withRelatedFields,
                    withRelatedPrimary,
                    id,
                    offset,
                    limit
                } = options;

                const tableNames = {
                    Post: 'posts',
                    User: 'users',
                    Tag: 'tags'
                };

                const tableName = tableNames[modelName];
                const tableDef = schema.tables[tableName];
                const booleanColumns = [];
                for (const key in tableDef) {
                    if (!key.startsWith('@@') && tableDef[key].type === 'boolean') {
                        booleanColumns.push(key);
                    }
                }

                const relations = {
                    tags: {
                        targetTable: 'tags',
                        name: 'tags',
                        pivotTable: 'posts_tags',
                        pivotFk: 'tag_id',
                        pivotParentId: 'post_id',
                        extraFields: ['visibility'],
                        orderBy: 'sort_order'
                    },
                    authors: {
                        targetTable: 'users',
                        name: 'authors',
                        pivotTable: 'posts_authors',
                        pivotFk: 'author_id',
                        pivotParentId: 'post_id',
                        extraFields: [],
                        orderBy: 'sort_order'
                    }
                };

                let query = Bookshelf.knex(tableName);

                if (offset) {
                    query.offset(offset);
                }

                if (limit) {
                    query.limit(limit);
                }

                // select only the fields needed
                if (include) {
                    query.select(include);
                }

                // @NOTE: We can't use the filter plugin, because we are not using bookshelf.
                // Lazyloaded to keep boot fast
                const nql = require('@tryghost/nql');
                nql(filter).querySQL(query);

                if (shouldHavePosts) {
                    plugins.hasPosts.addHasPostsWhere(tableName, shouldHavePosts)(query);
                }

                if (id) {
                    query.where({id});
                }

                if (!withRelated) {
                    let objects = await query;
                    debug('fetched', modelName, filter);

                    if (!objects.length) {
                        debug('No more entries found');
                        return [];
                    }

                    for (const object of objects) {
                        for (const col of booleanColumns) {
                            if (col in object) {
                                object[col] = !!object[col];
                            }
                        }
                    }
                    return objects;
                }

                // Build a subquery mirroring the main query's conditions (filter,
                // shouldHavePosts, id) so relation queries use a subquery instead
                // of materializing every post ID as a literal in WHERE IN.
                function buildIdSubquery() {
                    const sub = Bookshelf.knex(tableName).select('id');
                    nql(filter).querySQL(sub);
                    if (shouldHavePosts) {
                        plugins.hasPosts.addHasPostsWhere(tableName, shouldHavePosts)(sub);
                    }
                    if (id) {
                        sub.where({id});
                    }
                    return sub;
                }

                // Prepare relation queries BEFORE awaiting the main query so
                // all queries can run in parallel on separate connections.
                const relationMeta = [];
                const relationPromises = [];

                for (const withRelatedKey of withRelated) {
                    const relation = relations[withRelatedKey];

                    const keepFields = (withRelatedFields[withRelatedKey] || [])
                        .map(f => f.replace(/^\w+\./, ''));

                    // Query 1: Pivot table only — small rows, no JOIN
                    const pivotQuery = Bookshelf.knex(relation.pivotTable)
                        .select(relation.pivotParentId, relation.pivotFk)
                        .whereIn(relation.pivotParentId, buildIdSubquery())
                        .orderBy(relation.orderBy);

                    // Query 2: All rows from the target table — tiny
                    const lookupSelectFields = ['id', ...keepFields, ...relation.extraFields];
                    const lookupQuery = Bookshelf.knex(relation.targetTable)
                        .select([...new Set(lookupSelectFields)]);

                    relationMeta.push({
                        name: relation.name,
                        fkCol: relation.pivotFk,
                        parentIdCol: relation.pivotParentId
                    });

                    relationPromises.push(pivotQuery, lookupQuery);
                }

                // Fire main query + all relation queries in parallel.
                // Relation queries use subqueries so they don't depend on
                // the main query results — they can overlap on the wire.
                const [objects, ...relationResults] = await Promise.all([
                    query, ...relationPromises
                ]);

                debug('fetched', modelName, filter);

                if (!objects.length) {
                    debug('No more entries found');
                    return [];
                }

                // Process relation results (pairs of [pivotRows, lookupRows])
                const relationsToAttach = Object.create(null);
                for (let i = 0; i < relationMeta.length; i++) {
                    const meta = relationMeta[i];
                    const pivotRows = relationResults[i * 2];
                    const lookupRows = relationResults[i * 2 + 1];

                    debug('fetched withRelated', meta.name);

                    // Build lookup map: target id → target data
                    const lookupMap = Object.create(null);
                    for (const row of lookupRows) {
                        lookupMap[row.id] = row;
                    }

                    // Join in JS: iterate pivot rows, look up target data.
                    // Push lookup row references directly — the lookup query
                    // already SELECTs only the needed fields, so no per-row
                    // field picking is required. Posts sharing the same tag/author
                    // reference the same object, avoiding 750k allocations.
                    const grouped = Object.create(null);
                    for (const pivotRow of pivotRows) {
                        const parentId = pivotRow[meta.parentIdCol];
                        const targetData = lookupMap[pivotRow[meta.fkCol]];
                        if (!targetData) {
                            continue;
                        }
                        if (!grouped[parentId]) {
                            grouped[parentId] = [];
                        }
                        grouped[parentId].push(targetData);
                    }
                    relationsToAttach[meta.name] = grouped;
                }

                debug('attaching relations to', modelName);

                for (const object of objects) {
                    for (const relation in relationsToAttach) {
                        object[relation] = relationsToAttach[relation][object.id] || [];
                    }

                    // Compute primary_tag / primary_author virtual properties
                    // that Bookshelf's toJSON used to produce automatically.
                    if (withRelatedPrimary) {
                        for (const primaryKey in withRelatedPrimary) {
                            const relationKey = withRelatedPrimary[primaryKey];
                            const items = object[relationKey];
                            if (items && items.length && items[0].visibility !== 'internal') {
                                object[primaryKey] = items[0];
                            } else {
                                object[primaryKey] = null;
                            }
                        }
                    }

                    for (const col of booleanColumns) {
                        if (col in object) {
                            object[col] = !!object[col];
                        }
                    }
                }

                debug('attached relations to', modelName);
                return objects;
            }
        }
    });
};
