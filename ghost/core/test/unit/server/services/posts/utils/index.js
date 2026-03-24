const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');

const createModel = (propertiesAndRelations) => {
    const id = propertiesAndRelations.id ?? ObjectId().toHexString();
    return {
        id,
        getLazyRelation: (relation) => {
            propertiesAndRelations.loaded = propertiesAndRelations.loaded ?? [];
            if (!propertiesAndRelations.loaded.includes(relation)) {
                propertiesAndRelations.loaded.push(relation);
            }
            if (Array.isArray(propertiesAndRelations[relation])) {
                return Promise.resolve({
                    models: propertiesAndRelations[relation],
                    toJSON: () => {
                        return propertiesAndRelations[relation].map(m => m.toJSON());
                    }
                });
            }
            return Promise.resolve(propertiesAndRelations[relation]);
        },
        related: (relation) => {
            if (!Object.keys(propertiesAndRelations).includes('loaded')) {
                throw new Error(`Model.related('${relation}'): When creating a test model via createModel you must include 'loaded' to specify which relations are already loaded and useable via Model.related.`);
            }
            if (!propertiesAndRelations.loaded.includes(relation)) {
                throw new Error(`Model.related('${relation}') was used on a test model that didn't explicitly loaded that relation.`);
            }
            if (Array.isArray(propertiesAndRelations[relation])) {
                const arr = [...propertiesAndRelations[relation]];
                arr.toJSON = () => {
                    return arr.map(m => m.toJSON());
                };
                return arr;
            }

            // Simulate weird bookshelf behaviour of returning a new model
            if (!propertiesAndRelations[relation]) {
                const m = createModel({});
                m.id = null;
                return m;
            }

            return propertiesAndRelations[relation];
        },
        get: (property) => {
            return propertiesAndRelations[property];
        },
        save: (properties) => {
            Object.assign(propertiesAndRelations, properties);
            return Promise.resolve();
        },
        toJSON: () => {
            return {
                id,
                ...propertiesAndRelations
            };
        }
    };
};

const createModelClass = (options = {}) => {
    return {
        ...options,
        options,
        add: async (properties) => {
            return Promise.resolve(createModel(properties));
        },
        findOne: async (data, o) => {
            if (options.findOne === null && o.require) {
                return Promise.reject(new Error('NotFound'));
            }
            if (options.findOne === null) {
                return Promise.resolve(null);
            }
            return Promise.resolve(
                createModel({...options.findOne, ...data})
            );
        },
        findAll: async (data) => {
            const models = (options.findAll ?? []).map(f => createModel({...f, ...data}));
            return Promise.resolve({
                models,
                map: models.map.bind(models),
                length: models.length
            });
        },
        findPage: async (data) => {
            const all = options.findAll ?? [];
            const limit = data.limit ?? 15;
            const page = data.page ?? 1;

            const start = (page - 1) * (limit === 'all' ? all.length : limit);
            const end = limit === 'all' ? all.length : (start + limit);

            const pageData = all.slice(start, end);
            return Promise.resolve(
                {
                    data: pageData.map(f => createModel({...f, ...data})),
                    meta: {
                        page,
                        limit
                    }
                }
            );
        },
        transaction: async (callback) => {
            const transacting = {transacting: 'transacting'};
            return await callback(transacting);
        },
        where: function () {
            return this;
        },
        save: async function () {
            return Promise.resolve();
        }
    };
};

const createDb = ({first, all} = {}) => {
    let a = all;
    const db = {
        knex: function () {
            return this;
        },
        where: function () {
            return this;
        },
        whereNull: function () {
            return this;
        },
        select: function () {
            return this;
        },
        limit: function (n) {
            a = all.slice(0, n);
            return this;
        },
        update: sinon.stub().resolves(),
        orderByRaw: function () {
            return this;
        },
        insert: function () {
            return this;
        },
        first: () => {
            return Promise.resolve(first);
        },
        then: function (resolve) {
            resolve(a);
        },
        transacting: function () {
            return this;
        }
    };
    db.knex.raw = function () {
        return this;
    };
    return db;
};

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/**
 * Create a mock Knex instance for streaming export tests.
 * Returns plain objects (not Bookshelf models) to match real Knex behavior.
 *
 * @param {Object} tables - Map of table names to arrays of row objects
 * @returns {Function} Mock knex function
 */
const createStreamingKnex = (tables = {}) => {
    const knex = function (tableName) {
        let rows = tables[tableName] || [];
        let selectedColumns = null;
        let conditions = {};

        const builder = {
            select(...cols) {
                selectedColumns = cols.flat();
                return builder;
            },
            join() {
                return builder;
            },
            where(colOrObj, val) {
                if (typeof colOrObj === 'string') {
                    conditions[colOrObj] = val;
                }
                return builder;
            },
            whereIn(col, vals) {
                rows = rows.filter(r => vals.includes(r[col] || r.post_id || r.attribution_id));
                return builder;
            },
            groupBy() {
                return builder;
            },
            orderBy() {
                return builder;
            },
            orderByRaw() {
                return builder;
            },
            count() {
                return builder;
            },
            countDistinct() {
                return builder;
            },
            sum() {
                return builder;
            },
            whereRaw() {
                return builder;
            },
            limit(n) {
                rows = rows.slice(0, n);
                return builder;
            },
            stream() {
                const {Readable} = require('stream');
                let filteredRows = [...rows];

                if (conditions.attribution_type) {
                    filteredRows = filteredRows.filter(r => r.attribution_type === conditions.attribution_type);
                }
                if (conditions.score !== undefined) {
                    filteredRows = filteredRows.filter(r => r.score === conditions.score);
                }

                let i = 0;
                return new Readable({
                    objectMode: true,
                    read() {
                        if (i < filteredRows.length) {
                            this.push(filteredRows[i]);
                            i += 1;
                        } else {
                            this.push(null);
                        }
                    }
                });
            },
            then(resolve) {
                let filteredRows = [...rows];

                if (conditions.attribution_type) {
                    filteredRows = filteredRows.filter(r => r.attribution_type === conditions.attribution_type);
                }
                if (conditions.score !== undefined) {
                    filteredRows = filteredRows.filter(r => r.score === conditions.score);
                }

                if (selectedColumns) {
                    filteredRows = filteredRows.map((r) => {
                        const selected = {};
                        for (const col of selectedColumns) {
                            if (col in r) {
                                selected[col] = r[col];
                            }
                        }
                        return selected;
                    });
                }

                resolve(filteredRows);
            }
        };

        return builder;
    };

    knex.raw = function () {
        return knex;
    };

    return knex;
};

module.exports = {
    createModel,
    createModelClass,
    createDb,
    createStreamingKnex,
    sleep
};
