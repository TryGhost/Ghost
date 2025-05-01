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

module.exports = {
    createModel,
    createModelClass,
    createDb,
    sleep
};
