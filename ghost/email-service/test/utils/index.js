const ObjectId = require('bson-objectid').default;

const createModel = (propertiesAndRelations) => {
    return {
        id: propertiesAndRelations.id ?? ObjectId().toHexString(),
        getLazyRelation: (relation) => {
            return Promise.resolve(propertiesAndRelations[relation]);
        },
        get: (property) => {
            return propertiesAndRelations[property];
        },
        save: (properties) => {
            Object.assign(propertiesAndRelations, properties);
            return Promise.resolve();
        }
    };
};

const createModelClass = (options = {}) => {
    return {
        ...options,
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
        }
    };
};

module.exports = {
    createModel,
    createModelClass
};
