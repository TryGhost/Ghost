const jsonSchema = require('./utils/json-schema');

const getJSONDefinition = (version, name) => {
    const definitionPath = `./${version}/${name}`;

    try {
        return require(definitionPath);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            return undefined;
        }
    }
};

const get = ({version, definitionName}) => getJSONDefinition(version, definitionName);

/**
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
 * Validates objects against predefined JSON Schema
 *
 * @param {Object} options
 * @param {Object} options.data - data to validate
 * @param {string} options.version - API version to data belongs to, e.g.: 'v2', 'canary'
 * @param {string} options.schema - name of the schema to validate against. Available schema names are returned by list() function
 * @param {string} options.definitions - name of the definition where schema belongs
 *
 * @returns {Promise} - resolves a promise if validation is successful and rejects with error details otherwise
 */
const validate = ({data, version, schema, definitions}) => {
    const schemaJSON = get({definitionName: schema, version});
    const definitionsJSON = get({definitionName: definitions, version});

    return jsonSchema.validate(schemaJSON, definitionsJSON, data);
};

const augmentWithVersion = (version, fn, args) => {
    return fn(Object.assign({}, {version}, args));
};

const v2 = {
    get: (definitionName) => {
        return augmentWithVersion('v2', get, {definitionName});
    },
    list: () => {
        return augmentWithVersion('v2', list, {});
    },
    validate: (options) => {
        return augmentWithVersion('v2', validate, options);
    }
};

const canary = {
    get: (definitionName) => {
        return augmentWithVersion('canary', get, {definitionName});
    },
    list: () => {
        return augmentWithVersion('canary', list, {});
    },
    validate: (options) => {
        return augmentWithVersion('canary', validate, options);
    }
};

module.exports = {
    get: canary.get,
    list: canary.list,
    validate: canary.validate,
    v2: v2,
    v3: canary,
    canary: canary
};
