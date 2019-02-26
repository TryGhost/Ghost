const _ = require('lodash');
const Ajv = require('ajv');
const stripKeyword = require('./strip-keyword');
const common = require('../../../../../lib/common');

const validate = (schema, definitions, data) => {
    const ajv = new Ajv({
        allErrors: true,
        useDefaults: true
    });

    stripKeyword(ajv);

    const validation = ajv.addSchema(definitions).compile(schema);

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
