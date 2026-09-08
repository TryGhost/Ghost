import type { TierCheckoutConfig } from '../../services/tier-checkout-config';

const tiersService = require('../../services/tiers');

/**
 * What each tier needs from a member, as the member being asked.
 *
 * The same rows as the publisher's `tiers_checkout_config`, and a resource of its own
 * rather than that one re-authorised, because the two carry different things. A
 * publisher's version says which field each collected value is kept in; a member has no
 * use for that and is never told it. What is left is only what they will be asked for,
 * which is why this is named for the requirement rather than for the configuration.
 *
 * Its own name rather than the same one because a response shape follows the `docName`.
 * Sharing the name would mean sharing the payload, and a member would be handed field
 * keys, a tax number Ghost never stores, and questions this path does not draw.
 *
 * Every configured tier at once, rather than one named tier. The plan page shows them all,
 * and a member deciding between two tiers wants to know which of them will ask for a
 * delivery address before they pick one, not after. It also has to answer for a tier the
 * member is not on, which is the only case that matters here.
 *
 * Signed in, but not about any particular member: a tier asks the same of everyone. The
 * route settles who is asking and refuses an unknown caller, because what a publisher
 * collects is their configuration rather than something the site announces.
 */

const controller = {
  docName: 'tiers_checkout_requirements',

  browse: {
    headers: { cacheInvalidate: false },
    permissions: false,
    query(): Promise<TierCheckoutConfig[]> {
      // Only tiers a publisher has set up come back, so a site collecting nothing
      // answers with an empty list rather than a row per tier saying "nothing".
      return tiersService.checkout.browse();
    },
  },
};

export default controller;
module.exports = controller;
