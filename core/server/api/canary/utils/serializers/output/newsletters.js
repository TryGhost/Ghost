//@ts-check
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:newsletters');

module.exports = {
    browse: createSerializer('browse', paginatedNewsletters)
};

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{newsletters: SerializedNewsletter[], meta: PageMeta}}
 */
function paginatedNewsletters(page, _apiConfig, frame) {
    return {
        newsletters: serializeNewsletters(page, frame),
        meta: page.meta
    };
}

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {Frame} frame
 *
 * @returns {SerializedNewsletter[]}
 */
function serializeNewsletters(page, frame) {
    const newsletters = page.data.map((model) => {
        return serializeNewsletter(model, frame.options, frame.apiType);
    });

    // Return only active newsletters for content api
    if (frame.apiType === 'content') {
        return newsletters.filter((d) => {
            return d.status === 'active';
        });
    }
    return newsletters;
}

/**
 * @param {import('bookshelf').Model} newsletter
 * @param {object} options
 * @param {'content'|'admin'} apiType
 *
 * @returns {SerializedNewsletter}
 */
function serializeNewsletter(newsletter, options, apiType) {
    const json = newsletter.toJSON(options);
    if (apiType === 'content') {
        const serialized = {
            id: json.id,
            uuid: json.uuid,
            name: json.name,
            description: json.description,
            status: json.status,
            slug: json.slug,
            visibility: json.visibility,
            sort_order: json.sort_order,
            footer_content: json.footer_content,
            created_at: json.created_at,
            updated_at: json.updated_at
        };

        return serialized;
    }
    return json;
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
 * @typedef {Object} SerializedNewsletter
 * @prop {string} id
 * @prop {string} uuid
 * @prop {string} name
 * @prop {string} description
 * @prop {string} slug
 * @prop {string} status
 * @prop {string} visibility
 * @prop {number} sort_order
 * @prop {string} footer_content
 * @prop {Date} created_at
 * @prop {Date} updated_at
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
