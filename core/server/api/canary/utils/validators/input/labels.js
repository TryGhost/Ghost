const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        const schema = require('./schemas/labels-add');
        const definitions = require('./schemas/labels');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require('./schemas/labels-edit');
        const definitions = require('./schemas/labels');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
