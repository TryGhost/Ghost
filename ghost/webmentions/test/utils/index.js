const ObjectId = require('bson-objectid').default;

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
                    models: propertiesAndRelations[relation]
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
            return propertiesAndRelations[relation];
        },
        get: (property) => {
            return propertiesAndRelations[property];
        },
        previous: (property) => {
            return propertiesAndRelations.previous[property];
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
module.exports = {
    createModel
};
