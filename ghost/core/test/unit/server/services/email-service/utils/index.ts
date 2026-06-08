import ObjectId from 'bson-objectid';
import sinon from 'sinon';

interface ModelProperties {
    id?: string;
    loaded?: string[];
    [key: string]: any;
}

interface TestModel {
    id: string | null;
    // eslint-disable-next-line no-unused-vars
    getLazyRelation: (relation: string) => Promise<any>;
    // eslint-disable-next-line no-unused-vars
    related: (relation: string) => any;
    // eslint-disable-next-line no-unused-vars
    get: (property: string) => any;
    // eslint-disable-next-line no-unused-vars
    save: (properties: ModelProperties) => Promise<void>;
    toJSON: () => any;
}

const createModel = (propertiesAndRelations: ModelProperties): TestModel => {
    const id = propertiesAndRelations.id ?? ObjectId().toHexString();
    return {
        id,
        getLazyRelation: (relation: string) => {
            propertiesAndRelations.loaded = propertiesAndRelations.loaded ?? [];
            if (!propertiesAndRelations.loaded.includes(relation)) {
                propertiesAndRelations.loaded.push(relation);
            }
            if (Array.isArray(propertiesAndRelations[relation])) {
                return Promise.resolve({
                    models: propertiesAndRelations[relation],
                    toJSON: () => {
                        return propertiesAndRelations[relation].map((m: TestModel) => m.toJSON());
                    }
                });
            }
            return Promise.resolve(propertiesAndRelations[relation]);
        },
        related: (relation: string) => {
            if (!Object.keys(propertiesAndRelations).includes('loaded')) {
                throw new Error(`Model.related('${relation}'): When creating a test model via createModel you must include 'loaded' to specify which relations are already loaded and useable via Model.related.`);
            }
            if (!propertiesAndRelations.loaded!.includes(relation)) {
                //throw new Error(`Model.related('${relation}') was used on a test model that didn't explicitly loaded that relation.`);
            }
            if (Array.isArray(propertiesAndRelations[relation])) {
                const arr = [...propertiesAndRelations[relation]];
                (arr as any).toJSON = () => {
                    return arr.map((m: TestModel) => m.toJSON());
                };
                return arr;
            }

            // Simulate weird bookshelf behaviour of returning a new model
            if (!propertiesAndRelations[relation]) {
                const m = createModel({
                    loaded: []
                });
                m.id = null;
                return m;
            }

            return propertiesAndRelations[relation];
        },
        get: (property: string) => {
            return propertiesAndRelations[property];
        },
        save: (properties: ModelProperties) => {
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

interface ModelClassOptions {
    findOne?: any;
    findAll?: any[];
    [key: string]: any;
}

const createModelClass = (options: ModelClassOptions = {}) => {
    return {
        ...options,
        options,
        add: async (properties: any) => {
            return Promise.resolve(createModel(properties));
        },
        findOne: async (data: any, o?: {require?: boolean}) => {
            if (options.findOne === null && o?.require) {
                return Promise.reject(new Error('NotFound'));
            }
            if (options.findOne === null) {
                return Promise.resolve(null);
            }
            return Promise.resolve(
                createModel({...options.findOne, ...data})
            );
        },
        findAll: async (data: any) => {
            const models = (options.findAll ?? []).map(f => createModel({...f, ...data}));
            return Promise.resolve({
                models,
                map: models.map.bind(models),
                filter: models.filter.bind(models),
                length: models.length
            });
        },
        findPage: async (data: any) => {
            const all = options.findAll ?? [];
            const limit = data.limit ?? 15;
            const page = data.page ?? 1;

            const start = (page - 1) * (limit === 'all' ? all.length : limit);
            const end = limit === 'all' ? all.length : (start + limit);

            const pageData = all.slice(start, end);
            return Promise.resolve(
                {
                    data: pageData.map((f: any) => createModel({...f, ...data})),
                    meta: {
                        page,
                        limit
                    }
                }
            );
        },
        // eslint-disable-next-line no-unused-vars
        transaction: async (callback: (transacting: any) => Promise<any>) => {
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

interface DbOptions {
    first?: any;
    all?: any[];
}

const createDb = ({first, all}: DbOptions = {}) => {
    let a = all;
    const db: any = {
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
        limit: function (n: number) {
            a = all?.slice(0, n);
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
        // eslint-disable-next-line no-unused-vars
        then: function (resolve: (value: any) => void) {
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

interface PrometheusClientOptions {
    registerCounterStub?: sinon.SinonStub;
    getMetricStub?: sinon.SinonStub;
    incStub?: sinon.SinonStub;
}

const createPrometheusClient = ({registerCounterStub, getMetricStub, incStub}: PrometheusClientOptions = {}) => {
    return {
        registerCounter: registerCounterStub ?? sinon.stub(),
        getMetric: getMetricStub ?? sinon.stub().returns({
            inc: incStub ?? sinon.stub()
        })
    };
};

const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export {
    createModel,
    createModelClass,
    createDb,
    createPrometheusClient,
    sleep
};
