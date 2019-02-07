const Ajv = require('ajv');
const common = require('../../../../../lib/common');

const validate = (schema, definitions, json) => {
    const ajv = new Ajv({
        allErrors: true
    });

    const validation = ajv.addSchema(definitions).compile(schema);

    validation(json);

    if (validation.errors) {
        return Promise.reject(new common.errors.ValidationError({
            message: common.i18n.t('notices.data.validation.index.validationFailed', {
                errorDetails: validation.errors
            })
        }));
    }
};

module.exports.validate = validate;
