const logging = require('@tryghost/logging');
const labs = require('../../../shared/labs');
const tiersService = require('../../services/tiers');
const { requirementsByTier } = require('../../services/tier-checkout-config');

/**
 * What each tier asks a member for, or nothing when the site does not do that.
 *
 * Looked up per request rather than kept with the tier, because a tier is loaded into
 * memory once at boot and these rows change underneath it: deleting a custom field
 * cascades a tier's binding away without that repository ever hearing about it, so a copy
 * taken at boot would go on promising to ask for a field the site no longer has.
 *
 * One lookup per response, and only for this payload. Staff read these settings through a
 * resource of their own that carries them in full, and the payloads carrying tiers in
 * bulk each build their own reduced projection of a tier, so none of them pays for this.
 *
 * A failure costs the requirements and nothing else. A tier a reader cannot see the price
 * of is worse than one whose delivery question they meet a moment later.
 */
async function requirements() {
  if (!labs.isSet('stripeCheckoutCollection')) {
    return undefined;
  }

  try {
    return requirementsByTier(await tiersService.checkout.browse());
  } catch (err) {
    logging.error(
      { event: { name: 'tiers.requirements.read_failed' }, err },
      'Failed to read what tiers ask a member for',
    );
    return undefined;
  }
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'tiers',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'fields', 'filter', 'order', 'debug', 'page'],
    permissions: true,
    async query(frame) {
      const page = await tiersService.api.browse(frame.options);

      // Carried on the page rather than fetched while serializing, so the serializer
      // renders what it was handed. The admin controller looks none up, which is what
      // keeps them off the admin payload — no serializer needs to ask who is calling.
      return { ...page, requirements: await requirements() };
    },
  },
};

module.exports = controller;
