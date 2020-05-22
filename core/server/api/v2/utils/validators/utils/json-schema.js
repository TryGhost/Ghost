const _ = require('lodash');
const Ajv = require('ajv');
const stripKeyword = require('./strip-keyword');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');

const ajv = new Ajv({
    allErrors: true,
    useDefaults: true,
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

stripKeyword(ajv);

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
            message: i18n.t('notices.data.validation.index.schemaValidationFailed', {
                key: key
            }),
            property: key,
            errorDetails: validation.errors
        }));
    }

    return Promise.resolve();
};

module.exports.validate = validate;
