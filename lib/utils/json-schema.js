const _ = require('lodash');
const Ajv = require('ajv');
const isLowercaseKeyword = require('./is-lowercase-keyword');
const errors = require('@tryghost/errors');

const ajv = new Ajv({
    allErrors: true,
    useDefaults: true,
    removeAdditional: true,
    formats: {
        'json-string': (data) => {
            try {
                JSON.parse(data);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
});

isLowercaseKeyword(ajv);

const getValidation = (schema, def) => {
    if (!ajv.getSchema(def.$id)) {
        ajv.addSchema(def);
    }
    return ajv.getSchema(schema.$id) || ajv.compile(schema);
};

const validate = (schema, definition, data) => {
    const validation = getValidation(schema, definition);

    validation(data);

    if (validation.errors) {
        let key;
        const dataPath = _.get(validation, 'errors[0].dataPath');

        if (dataPath) {
            key = dataPath.split('.').pop();
        } else {
            key = schema.$id.split('.')[0];
        }

        return Promise.reject(new errors.ValidationError({
            message: `Validation failed for ${key}.`,
            property: key,
            errorDetails: validation.errors
        }));
    }

    return Promise.resolve();
};

module.exports.validate = validate;
