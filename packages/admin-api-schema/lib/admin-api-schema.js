const errors = require('@tryghost/errors');
const jsonSchema = require('./utils/json-schema');

/**
 *
 * @param {string} name -JSON schema to retreive from "schemas" folder
 *
 * @returns {Object} - JSON schema file content
 */
const getJSONDefinition = (name) => {
    const definitionPath = `./schemas/${name}`;

    try {
        return require(definitionPath);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            return null;
        }
    }
};

/**
 * Lists available JSON schema definitions
 *
 * @returns {string[]} - list of available JSON schema definitions
 */
const list = () => {
    return require('./schemas');
};

/**
 * Validate method parameters
 *
 * @typedef {Object} ValidateOptions
 * @property {Object} options.data - data to validate
 * @property {string} [options.schema] - name of the schema to validate against. Available schema names are returned by list() function
 * @property {string} [options.definition] - name of the definition where schema belongs
 */

/**
 * Validates objects against predefined JSON Schema
 *
 * @param {ValidateOptions} options
 *
 * @returns {Promise} - resolves a promise if validation is successful and rejects with error details otherwise
 */
const validate = ({data, schema, definition = schema?.split('-')[0]}) => {
    const schemaJSON = getJSONDefinition(schema);

    if (!schemaJSON) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot find schema for provided definition name.',
            context: `Definition for ${schema} does not exist.`
        });
    }

    const definitionJSON = getJSONDefinition(definition);

    return jsonSchema.validate(schemaJSON, definitionJSON, data);
};

module.exports = {
    get: getJSONDefinition,
    list: list,
    validate: validate
};
