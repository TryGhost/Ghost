const _ = require('lodash');
const debug = require('@tryghost/debug')('models:base:raw-knex');
const plugins = require('@tryghost/bookshelf-plugins');
const Promise = require('bluebird');

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
            fetchAll: function (options) {
                options = options || {};

                const nql = require('@nexes/nql');
                const modelName = options.modelName;
                const tableNames = {
                    Post: 'posts',
                    User: 'users',
                    Tag: 'tags'
                };
                const exclude = options.exclude;
                const filter = options.filter;
                const shouldHavePosts = options.shouldHavePosts;
                const withRelated = options.withRelated;
                const withRelatedFields = options.withRelatedFields;
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

                let query = Bookshelf.knex(tableNames[modelName]);

                if (options.offset) {
                    query.offset(options.offset);
                }

                if (options.limit) {
                    query.limit(options.limit);
                }

                // exclude fields if enabled
                if (exclude) {
                    let toSelect = _.keys(schema.tables[tableNames[modelName]]);
                    toSelect = toSelect.filter(key => !(key.startsWith('@@')));

                    _.each(exclude, (key) => {
                        if (toSelect.indexOf(key) !== -1) {
                            toSelect.splice(toSelect.indexOf(key), 1);
                        }
                    });

                    query.select(toSelect);
                }

                // @NOTE: We can't use the filter plugin, because we are not using bookshelf.
                nql(filter).querySQL(query);

                if (shouldHavePosts) {
                    plugins.hasPosts.addHasPostsWhere(tableNames[modelName], shouldHavePosts)(query);
                }

                if (options.id) {
                    query.where({id: options.id});
                }

                return query.then((objects) => {
                    debug('fetched', modelName, filter);

                    if (!objects.length) {
                        debug('No more entries found');
                        return Promise.resolve([]);
                    }

                    let props = {};

                    if (!withRelated) {
                        return _.map(objects, (object) => {
                            object = Bookshelf.registry.models[modelName].prototype.toJSON.bind({
                                attributes: object,
                                related: function (key) {
                                    return object[key];
                                },
                                serialize: Bookshelf.registry.models[modelName].prototype.serialize,
                                formatsToJSON: Bookshelf.registry.models[modelName].prototype.formatsToJSON
                            })();

                            object = Bookshelf.registry.models[modelName].prototype.fixBools(object);
                            object = Bookshelf.registry.models[modelName].prototype.fixDatesWhenFetch(object);
                            return object;
                        });
                    }

                    _.each(withRelated, (withRelatedKey) => {
                        const relation = relations[withRelatedKey];

                        props[relation.name] = (() => {
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

                            return relationQuery
                                .then((queryRelations) => {
                                    debug('fetched withRelated', relation.name);

                                    // arr => obj[post_id] = [...] (faster access)
                                    return queryRelations.reduce((obj, item) => {
                                        if (!obj[item[relation.whereInKey]]) {
                                            obj[item[relation.whereInKey]] = [];
                                        }

                                        obj[item[relation.whereInKey]].push(_.omit(item, relation.select));
                                        return obj;
                                    }, {});
                                });
                        })();
                    });

                    return Promise.props(props)
                        .then((relationsToAttach) => {
                            debug('attach relations', modelName);

                            objects = _.map(objects, (object) => {
                                _.each(Object.keys(relationsToAttach), (relation) => {
                                    if (!relationsToAttach[relation][object.id]) {
                                        object[relation] = [];
                                        return;
                                    }

                                    object[relation] = relationsToAttach[relation][object.id];
                                });

                                object = Bookshelf.registry.models[modelName].prototype.toJSON.bind({
                                    attributes: object,
                                    _originalOptions: {
                                        withRelated: Object.keys(relationsToAttach)
                                    },
                                    related: function (key) {
                                        return object[key];
                                    },
                                    serialize: Bookshelf.registry.models[modelName].prototype.serialize,
                                    formatsToJSON: Bookshelf.registry.models[modelName].prototype.formatsToJSON
                                })();

                                object = Bookshelf.registry.models[modelName].prototype.fixBools(object);
                                object = Bookshelf.registry.models[modelName].prototype.fixDatesWhenFetch(object);
                                return object;
                            });

                            debug('attached relations', modelName);

                            return objects;
                        });
                });
            }
        }
    });
};
