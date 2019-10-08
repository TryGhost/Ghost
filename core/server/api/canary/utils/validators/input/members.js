const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        const schema = require('./schemas/members-add');
        const definitions = require('./schemas/members');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require('./schemas/members-edit');
        const definitions = require('./schemas/members');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
