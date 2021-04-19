//@ts-check
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:products');

module.exports = {
    browse: createSerializer('browse', paginatedProducts),
    read: createSerializer('read', singleProduct),
    edit: createSerializer('edit', singleProduct),
    add: createSerializer('add', singleProduct)
};

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{products: SerializedProduct[], meta: PageMeta}}
 */
function paginatedProducts(page, _apiConfig, frame) {
    return {
        products: page.data.map(model => serializeProduct(model, frame.options)),
        meta: page.meta
    };
}

/**
 * @param {import('bookshelf').Model} model
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{products: SerializedProduct[]}}
 */
function singleProduct(model, _apiConfig, frame) {
    return {
        products: [serializeProduct(model, frame.options)]
    };
}

/**
 * @param {import('bookshelf').Model} member
 * @param {object} options
 *
 * @returns {SerializedProduct}
 */
function serializeProduct(product, options) {
    const json = product.toJSON(options);

    return {
        id: json.id,
        name: json.name,
        slug: json.slug,
        created_at: json.created_at,
        updated_at: json.updated_at,
        stripe_prices: json.stripePrices
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
 * @typedef {Object} SerializedProduct
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
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
