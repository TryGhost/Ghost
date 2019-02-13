const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        const schema = require('./schemas/tags-add');
        const definitions = require('./schemas/tags');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require('./schemas/tags-edit');
        const definitions = require('./schemas/tags');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
