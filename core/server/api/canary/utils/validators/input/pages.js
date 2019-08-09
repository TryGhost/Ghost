const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        const schema = require(`./schemas/pages-add`);
        const definitions = require('./schemas/pages');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require(`./schemas/pages-edit`);
        const definitions = require('./schemas/pages');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
