const _ = require('lodash');
const Ajv = require('ajv');
const stripKeyword = require('./strip-keyword');
const common = require('../../../../../lib/common');

const ajv = new Ajv({
    allErrors: true,
    useDefaults: true
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

        return Promise.reject(new common.errors.ValidationError({
            message: common.i18n.t('notices.data.validation.index.schemaValidationFailed', {
                key: key
            }),
            property: key,
            errorDetails: validation.errors
        }));
    }

    return Promise.resolve();
};

module.exports.validate = validate;
