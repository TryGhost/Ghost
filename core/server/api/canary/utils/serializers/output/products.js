//@ts-check
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:products');
const _ = require('lodash');

const allowedIncludes = ['stripe_prices', 'monthly_price', 'yearly_price'];

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
    const requestedQueryIncludes = frame.original && frame.original.query && frame.original.query.include && frame.original.query.include.split(',') || [];
    const requestedOptionsIncludes = frame.original && frame.original.options && frame.original.options.include || [];
    return {
        products: page.data.map((model) => {
            return cleanIncludes(
                allowedIncludes,
                requestedQueryIncludes.concat(requestedOptionsIncludes),
                serializeProduct(model, frame.options, frame.apiType)
            );
        }),
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
    const requestedQueryIncludes = frame.original && frame.original.query && frame.original.query.include && frame.original.query.include.split(',') || [];
    const requestedOptionsIncludes = frame.original && frame.original.options && frame.original.options.include || [];
    return {
        products: [
            cleanIncludes(
                allowedIncludes,
                requestedQueryIncludes.concat(requestedOptionsIncludes),
                serializeProduct(model, frame.options, frame.apiType)
            )
        ]
    };
}

/**
 * @param {import('bookshelf').Model} product
 * @param {object} options
 * @param {'content'|'admin'} apiType
 *
 * @returns {SerializedProduct}
 */
function serializeProduct(product, options, apiType) {
    const json = product.toJSON(options);

    const hideStripeData = apiType === 'content';

    const serialized = {
        id: json.id,
        name: json.name,
        description: json.description,
        slug: json.slug,
        created_at: json.created_at,
        updated_at: json.updated_at,
        stripe_prices: json.stripePrices ? json.stripePrices.map(price => serializeStripePrice(price, hideStripeData)) : null,
        monthly_price: serializeStripePrice(json.monthlyPrice, hideStripeData),
        yearly_price: serializeStripePrice(json.yearlyPrice, hideStripeData),
        benefits: json.benefits || null
    };

    return serialized;
}

/**
 * @param {object} data
 * @param {boolean} hideStripeData
 *
 * @returns {StripePrice}
 */
function serializeStripePrice(data, hideStripeData) {
    if (_.isEmpty(data)) {
        return null;
    }
    const price = {
        id: data.id,
        stripe_product_id: data.stripe_product_id,
        stripe_price_id: data.stripe_price_id,
        active: data.active,
        nickname: data.nickname,
        description: data.description,
        currency: data.currency,
        amount: data.amount,
        type: data.type,
        interval: data.interval,
        created_at: data.created_at,
        updated_at: data.updated_at
    };

    if (hideStripeData) {
        delete price.stripe_price_id;
        delete price.stripe_product_id;
    }

    return price;
}

/**
 * @template Data
 *
 * @param {string[]} allowed
 * @param {string[]} requested
 * @param {Data & Object<string, any>} data
 *
 * @returns {Data}
 */
function cleanIncludes(allowed, requested, data) {
    const cleaned = {
        ...data
    };
    for (const include of allowed) {
        if (!requested.includes(include)) {
            delete cleaned[include];
        }
    }
    return cleaned;
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
 * @prop {string} description
 * @prop {Date} created_at
 * @prop {Date} updated_at
 * @prop {StripePrice[]} [stripe_prices]
 * @prop {StripePrice} [monthly_price]
 * @prop {StripePrice} [yearly_price]
 * @prop {Benefit[]} [benefits]
 */

/**
 * @typedef {object} Benefit
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
 * @prop {Date} created_at
 * @prop {Date} updated_at
 */

/**
 * @typedef {object} StripePrice
 * @prop {string} id
 * @prop {string|null} stripe_product_id
 * @prop {string|null} stripe_price_id
 * @prop {boolean} active
 * @prop {string} nickname
 * @prop {string} description
 * @prop {string} currency
 * @prop {number} amount
 * @prop {'recurring'|'one-time'} type
 * @prop {'day'|'week'|'month'|'year'} interval
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
