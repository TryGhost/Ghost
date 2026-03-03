const _ = require('lodash');
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
                        innerJoin: {
                            relation: 'posts_tags',
                            condition: ['posts_tags.tag_id', '=', 'tags.id']
                        },
                        select: ['posts_tags.post_id as post_id', 'tags.visibility'],
                        whereIn: 'posts_tags.post_id',
                        whereInKey: 'post_id',
                        orderBy: 'sort_order'
                    },
                    authors: {
                        targetTable: 'users',
                        name: 'authors',
                        innerJoin: {
                            relation: 'posts_authors',
                            condition: ['posts_authors.author_id', '=', 'users.id']
                        },
                        select: ['posts_authors.post_id as post_id'],
                        whereIn: 'posts_authors.post_id',
                        whereInKey: 'post_id',
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

                let objects = await query;

                debug('fetched', modelName, filter);

                if (!objects.length) {
                    debug('No more entries found');
                    return [];
                }

                let props = {};

                if (!withRelated) {
                    for (const object of objects) {
                        for (const col of booleanColumns) {
                            if (col in object) {
                                object[col] = !!object[col];
                            }
                        }
                    }
                    return objects;
                }

                _.each(withRelated, (withRelatedKey) => {
                    const relation = relations[withRelatedKey];

                    props[relation.name] = (async () => {
                        debug('fetch withRelated', relation.name);

                        let relationQuery = Bookshelf.knex(relation.targetTable);

                        // default fields to select
                        _.each(relation.select, (fieldToSelect) => {
                            relationQuery.select(fieldToSelect);
                        });

                        // custom fields to select
                        _.each(withRelatedFields[withRelatedKey], (toSelect) => {
                            relationQuery.select(toSelect);
                        });

                        relationQuery.innerJoin(
                            relation.innerJoin.relation,
                            relation.innerJoin.condition[0],
                            relation.innerJoin.condition[1],
                            relation.innerJoin.condition[2]
                        );

                        relationQuery.whereIn(relation.whereIn, _.map(objects, 'id'));
                        relationQuery.orderBy(relation.orderBy);

                        const queryRelations = await relationQuery;
                        debug('fetched withRelated', relation.name);

                        // arr => obj[post_id] = [...] (faster access)
                        return queryRelations.reduce((obj, item) => {
                            if (!obj[item[relation.whereInKey]]) {
                                obj[item[relation.whereInKey]] = [];
                            }

                            obj[item[relation.whereInKey]].push(_.omit(item, relation.select));
                            return obj;
                        }, {});
                    })();
                });

                debug('attaching relations to', modelName);

                const relationsToAttachArray = await Promise.all(Object.values(props));
                const relationsToAttach = _.zipObject(_.keys(props), relationsToAttachArray);

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
