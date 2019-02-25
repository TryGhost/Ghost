const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        const schema = require(`./schemas/posts-add`);
        const definitions = require('./schemas/posts');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require(`./schemas/posts-edit`);
        const definitions = require('./schemas/posts');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
