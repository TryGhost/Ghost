const Ajv = require('ajv');

const validate = (schema, json) => {
    const ajv = new Ajv({
        allErrors: true
    });

    const validator = ajv.compile(schema);
    validator(json);

    return validator.errors;
};

module.exports.validate = validate;
