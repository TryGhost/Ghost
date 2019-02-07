const Ajv = require('ajv');

const validate = (schemaName, json) => {
    const ajv = new Ajv({
        allErrors: true
    });

    const schema = require(`./schemas/${schemaName}`);
    const validator = ajv.compile(schema);
    validator(json);

    return validator.errors;
};

module.exports.validate = validate;
