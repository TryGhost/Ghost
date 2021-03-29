//@ts-check
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:snippets');

module.exports = {
    browse: createSerializer('browse', paginatedSnippets),
    read: createSerializer('read', singleSnippet),
    edit: createSerializer('edit', singleSnippet),
    add: createSerializer('add', singleSnippet)
};

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{snippets: SerializedSnippet[], meta: PageMeta}}
 */
function paginatedSnippets(page, _apiConfig, frame) {
    return {
        snippets: page.data.map(model => serializeSnippet(model, frame.options)),
        meta: page.meta
    };
}

/**
 * @param {import('bookshelf').Model} model
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{snippets: SerializedSnippet[]}}
 */
function singleSnippet(model, _apiConfig, frame) {
    return {
        snippets: [serializeSnippet(model, frame.options)]
    };
}

/**
 * @template Data
 * @template Response
 * @param {string} debugString
 * @param {(data: Data, apiConfig: APIConfig, frame: Frame) => Response} serialize - A function to serialize the data into an object suitable for API response
 *
 * @returns {(data: Data, apiConfig: APIConfig, frame: Frame) => void}
 */
function createSerializer(debugString, serialize) {
    return function serializer(data, apiConfig, frame) {
        debug(debugString);
        const response = serialize(data, apiConfig, frame);
        frame.response = response;
    };
}

/**
 * @param {import('bookshelf').Model} snippet
 * @param {object} options
 *
 * @returns {SerializedSnippet}
 */
function serializeSnippet(snippet, options) {
    const json = snippet.toJSON(options);

    return {
        id: json.id,
        name: json.name,
        // @ts-ignore
        mobiledoc: json.mobiledoc,
        created_at: json.created_at,
        updated_at: json.updated_at,
        created_by: json.created_by,
        updated_by: json.updated_by
    };
}

/**
 * @typedef {Object} SerializedSnippet
 * @prop {string} id
 * @prop {string=} name
 * @prop {string=} mobiledoc
 * @prop {string} created_at
 * @prop {string} updated_at
 * @prop {string} created_by
 * @prop {string} updated_by
 */

/**
 * @typedef {Object} APIConfig
 * @prop {string} docName
 * @prop {string} method
 */

/**
 * @typedef {Object<string, any>} Frame
 * @prop {Object} options
 */
