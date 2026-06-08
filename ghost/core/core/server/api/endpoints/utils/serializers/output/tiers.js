//@ts-check
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:tiers');

module.exports = {
    browse: createSerializer('browse', paginatedTiers),
    read: createSerializer('read', singleTier),
    edit: createSerializer('edit', singleTier),
    add: createSerializer('add', singleTier)
};

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{tiers: SerializedTier[], meta: PageMeta}}
 */
function paginatedTiers(page, _apiConfig, frame) {
    return {
        tiers: page.data.map((model) => {
            return serializeTier(model, frame.options);
        }),
        meta: page.meta
    };
}

/**
 * @param {import('bookshelf').Model} model
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{tiers: SerializedTier[]}}
 */
function singleTier(model, _apiConfig, frame) {
    return {
        tiers: [
            serializeTier(model, frame.options)
        ]
    };
}

/**
 * @param {import('bookshelf').Model} tier
 * @param {object} options
 *
 * @returns {SerializedTier}
 */
function serializeTier(tier, options) {
    const json = tier.toJSON(options);

    const serialized = {
        id: json.id,
        name: json.name,
        description: json.description,
        slug: json.slug,
        active: json.status === 'active',
        type: json.type,
        welcome_page_url: json.welcomePageURL,
        created_at: json.createdAt,
        updated_at: json.updatedAt,
        visibility: json.visibility,
        benefits: json.benefits,
        currency: json.currency,
        monthly_price: json.monthlyPrice,
        yearly_price: json.yearlyPrice,
        trial_days: json.trialDays
    };

    if (!Array.isArray(serialized.benefits)) {
        serialized.benefits = null;
    }

    if (serialized.type === 'free') {
        delete serialized.currency;
        delete serialized.monthly_price;
        delete serialized.yearly_price;
    }

    return serialized;
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
 * @typedef {Object} FreeTier
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
 * @prop {string} description
 * @prop {boolean} active
 * @prop {string} type
 * @prop {string} welcome_page_url
 * @prop {Date} created_at
 * @prop {Date} updated_at
 * @prop {string[]} [benefits]
 */

/**
 * @typedef {FreeTier} PaidTier
 * @prop {string} currency
 * @prop {number} monthly_price
 * @prop {number} yearly_price
 */

/**
 * @typedef {FreeTier | PaidTier} SerializedTier
 * @prop {string} currency
 * @prop {number} monthly_price
 * @prop {number} yearly_price
 */

/**
 * @typedef {Object} APIConfig
 * @prop {string} docName
 * @prop {string} method
 */

/** @typedef {import('@tryghost/api-framework').Frame} Frame */
