//@ts-check
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:tiers');

const allowedIncludes = ['monthly_price', 'yearly_price'];
const localUtils = require('../../index');
const utils = require('../../../../shared/utils');

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
            return serializeTier(model, frame.options, frame);
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
            serializeTier(model, frame.options, frame)
        ]
    };
}

/**
 * @param {import('bookshelf').Model} tier
 * @param {object} options
 * @param {object} frame
 *
 * @returns {SerializedTier}
 */
function serializeTier(tier, options, frame) {
    const json = tier.toJSON(options);

    const serialized = {
        id: json.id,
        name: json.name,
        description: json.description,
        slug: json.slug,
        active: json.active,
        type: json.type,
        welcome_page_url: json.welcome_page_url,
        created_at: json.created_at,
        updated_at: json.updated_at,
        visibility: json.visibility,
        benefits: null
    };

    if (Array.isArray(json.benefits)) {
        serialized.benefits = json.benefits.map(benefit => benefit.name);
    } else {
        serialized.benefits = null;
    }

    if (serialized.type === 'paid') {
        serialized.currency = json.monthlyPrice?.currency;
        serialized.monthly_price = json.monthlyPrice?.amount;
        serialized.yearly_price = json.yearlyPrice?.amount;
    }

    if (!localUtils.isContentAPI(frame)) {
        const requestedQueryIncludes = frame.original && frame.original.query && frame.original.query.include && frame.original.query.include.split(',') || [];
        const requestedOptionsIncludes = utils.options.trimAndLowerCase(frame.original && frame.original.options && frame.original.options.include || []);

        return cleanIncludes(
            allowedIncludes,
            requestedQueryIncludes.concat(requestedOptionsIncludes),
            serialized
        );
    }

    return serialized;
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

/**
 * @typedef {Object<string, any>} Frame
 * @prop {Object} options
 */
