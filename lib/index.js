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

const get = ({version, definitionName}) => getJSONDefinition(version, definitionName);

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
const validate = ({data, version, schema, definitions}) => {
    const schemaJSON = get({definitionName: schema, version});
    const definitionsJSON = get({definitionName: definitions, version});

    return jsonSchema.validate(schemaJSON, definitionsJSON, data);
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
 * @param {string} definitionName - JSON schema definitions name
 * @param {string} version - API's JSON schema version to check against
 *
 * @returns {Object|null} JSON schema definition or null if it's not found
 */
const versionedGet = (definitionName, version = 'v3') => get({definitionName, version: resolveVersion(version)});

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
