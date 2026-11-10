//@ts-check
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:tiers');

module.exports = {
  browse: createSerializer('browse', paginatedTiers),
  read: createSerializer('read', singleTier),
  edit: createSerializer('edit', singleTier),
  add: createSerializer('add', singleTier),
};

/**
 * @template PageMeta
 *
 * @param {{data: Tier[], meta: PageMeta}} page
 *
 * @returns {{tiers: SerializedTier[], meta: PageMeta}}
 */
function paginatedTiers(page) {
  return {
    tiers: page.data.map((model) => {
      return serializeTier(model);
    }),
    meta: page.meta,
  };
}

/**
 * @param {Tier} model
 *
 * @returns {{tiers: SerializedTier[]}}
 */
function singleTier(model) {
  return {
    tiers: [serializeTier(model)],
  };
}

/**
 * @param {Tier} tier
 *
 * @returns {SerializedTier}
 */
function serializeTier(tier) {
  const json = tier.toJSON();

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
    trial_days: json.trialDays,
  };

  if (!Array.isArray(serialized.benefits)) {
    serialized.benefits = null;
  }

  // Only when read with the tier: other readers of tiers don't ask for them.
  if (Array.isArray(json.requirements)) {
    serialized.requirements = json.requirements.map(({ name, ports, countries }) => ({
      name,
      ports: Object.fromEntries(Object.entries(ports).map(([role, port]) => [role, { ...port }])),
      ...(countries ? { countries: [...countries] } : {}),
    }));
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
 * @prop {SerializedRequirement[]} [requirements]
 */

/**
 * What a tier's members must give, as tiers list it.
 *
 * @typedef {import('../../../../../services/tiers/requirements').TierRequirement} SerializedRequirement
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
/** @typedef {import('../../../../../services/tiers/tier')} Tier */
