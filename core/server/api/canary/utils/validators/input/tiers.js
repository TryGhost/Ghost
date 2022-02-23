const jsonSchema = require('../utils/json-schema');

module.exports = {
    add: jsonSchema.validate,
    edit: jsonSchema.validate
};
