const Ajv = require('ajv');
const stripKeyword = require('./strip-keyword');
const common = require('../../../../../lib/common');

const validate = (schema, definitions, data) => {
    const ajv = new Ajv({
        allErrors: true
    });

    stripKeyword(ajv);

    const validation = ajv.addSchema(definitions).compile(schema);

    validation(data);

    if (validation.errors) {
        return Promise.reject(new common.errors.ValidationError({
            message: common.i18n.t('notices.data.validation.index.validationFailed'),
            errorDetails: validation.errors
        }));
    }

    return Promise.resolve();
};

module.exports.validate = validate;
