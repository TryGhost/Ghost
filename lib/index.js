const errors = require('@tryghost/errors');
const jsonSchema = require('./utils/json-schema');

const getJSONDefinition = (version, name) => {
    const definitionPath = `./${version}/${name}`;

    try {
        return require(definitionPath);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            return null;
        }
    }
};

/**
 * Resolves with a schema definition content. At the moment it contains unresolved `$ref` statements.
 * This method needs some additional work to be useful for outside consumer - contain resolved '$ref'.
 *
 * @param {Object} options
 * @param {string} options.version - API's JSON schema version to check against
 * @param {string} options.schema - name of JSON schema definition, comes from available optios returned by list()
 */
const get = ({version, schema}) => {
    if (!list({version}).includes(schema)) {
        return null;
    }

    return getJSONDefinition(version, schema);
};

/**
 * Lists available JSON schema definitions for provided version
 *
 * @param {Object} options
 * @param {string} options.version - API's JSON schema version to check against
 *
 * @returns {string[]} - list of available JSON schema definitions
 */
const list = ({version}) => {
    if (version === 'v2') {
        return require('./v2');
    } else if (version === 'v3' || version === 'canary') {
        return require('./canary');
    }
};

/**
 * Validate method parameters
 *
 * @typedef {Object} ValidateOptions
 * @property {Object} options.data - data to validate
 * @property {string} options.version - API version to data belongs to, e.g.: 'v2', 'canary'
 * @property {string} options.schema - name of the schema to validate against. Available schema names are returned by list() function
 * @property {string} options.definitions - name of the definition where schema belongs
 */

/**
 * Validates objects against predefined JSON Schema
 *
 * @param {ValidateOptions} options
 *
 * @returns {Promise} - resolves a promise if validation is successful and rejects with error details otherwise
 */
const validate = ({data, version, schema = '', definition = schema.split('-')[0]}) => {
    const schemaJSON = get({schema, version});

    if (!schemaJSON) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot find schema for provided definition name.',
            context: `Definition for ${schema} does not exist.`
        });
    }

    const definitionJSON = getJSONDefinition(version, definition);

    return jsonSchema.validate(schemaJSON, definitionJSON, data);
};

const resolveVersion = (version) => {
    if (version === 'v3') {
        // NOTE: internally canary is used to identify latest available version, in this case it's 'v3'
        //       once there's following version introduced - 'v4' that version should be substituted with 'canary'
        return 'canary';
    }

    // At the moment these are the only versions of API JSON Schemas availalbe
    if (!['v2', 'canary'].includes(version)) {
        throw new errors.IncorrectUsageError();
    }

    return version;
};

/**
 * Versioned version of 'get' method, which returns a JSON schema definition if found
 *
 * @param {string} schema - name of JSON schema definitions
 * @param {string} version - API's JSON schema version to check against
 *
 * @returns {Object|null} JSON schema definition or null if it's not found
 */
const versionedGet = (schema, version = 'v3') => get({schema, version: resolveVersion(version)});

/**
 * Versioned version of 'list' method, which lisists available JSON schema definitions for provided version
 *
 * @param {string} version - API's JSON schema version to check against
 *
 * @returns {string[]} - list of available JSON schema definitions
 */
const versionedList = (version = 'v3') => list({version: resolveVersion(version)});

/**
 * Versioned version of 'validate' method, which validates objects against predefined JSON Schema
 *
 * @param {ValidateOptions} options
 *
 * @returns {Promise} - resolves a promise if validation is successful and rejects with error details otherwise
 */
const versionedValidate = options => validate(Object.assign(options, {version: resolveVersion(options.version || 'v3')}));

module.exports = {
    get: versionedGet,
    list: versionedList,
    validate: versionedValidate
};
