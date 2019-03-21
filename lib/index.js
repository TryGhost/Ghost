const _ = require('lodash');
const Ajv = require('ajv');
const stripKeyword = require('./keywords/strip');

const validate = (schema, definitions, data) => {
    if (!schema) {
        return;
    }

    const ajv = new Ajv({
        allErrors: true,
        useDefaults: true
    });

    stripKeyword(ajv);

    if (definitions) {
        ajv.addSchema(definitions);
    }

    const validation = ajv.compile(schema);

    validation(data);

    if (validation.errors) {
        let key;

        const dataPath = _.get(validation, 'errors[0].dataPath');

        if (dataPath) {
            key = dataPath.split('.').pop();
        } else {
            key = schema.$id.split('.')[0];
        }

        return {
            property: key,
            errorDetails: validation.errors
        };
    }
};

module.exports.validate = validate;
