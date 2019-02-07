const Ajv = require('ajv');

const validate = (schema, definitions, json) => {
    const ajv = new Ajv({
        allErrors: true
    });

    const validator = ajv.addSchema(definitions).compile(schema);

    validator(json);

    return validator.errors;
};

module.exports.validate = validate;
