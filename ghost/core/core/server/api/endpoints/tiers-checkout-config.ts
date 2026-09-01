import { actingContext } from '../../services/members-custom-fields';
import { emptyCheckoutConfig } from '../../services/tier-checkout-config';
import type { TierCheckoutConfig } from '../../services/tier-checkout-config';

const tiersService = require('../../services/tiers');

interface Frame {
  data: { tiers_checkout_config?: unknown[] };
  options: { id: string; context: unknown; [key: string]: unknown };
}

export type TierCheckoutResult = TierCheckoutConfig[];

/**
 * Reads one tier's checkout settings for the API to return.
 *
 * The service answers with null when nobody has ever set up checkout for the tier, because
 * there is genuinely nothing stored for it. The API still answers with a resource: the tier
 * itself exists, so a client asking what it collects should be told "nothing" in the same
 * shape as any other answer, rather than getting a 404 or an empty body to puzzle over.
 */
async function forTier(id: string): Promise<TierCheckoutConfig> {
  return (await tiersService.checkout.read(id)) ?? emptyCheckoutConfig(id);
}

/**
 * A tier's checkout configuration, as a sub-resource of the tier rather than an attribute
 * of it.
 *
 * The tier resource is generally available and this concept is not, so putting it on the
 * tier payload would add a key to every tier response on every site whether or not the
 * feature is on. A route of its own can carry the flag, and be removed with it.
 *
 * Every operation here is one call. A tier's configuration is one shape the service hands
 * out and takes back, and that it spans tables, that destinations are site-wide, and that a
 * binding exists at all are facts about the inside of that domain.
 */
const controller = {
  docName: 'tiers_checkout_config',

  browse: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'browse' },
    query(): Promise<TierCheckoutResult> {
      return tiersService.checkout.browse();
    },
  },

  read: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'products', method: 'read' },
    async query(frame: Frame): Promise<TierCheckoutResult> {
      return [await forTier(frame.options.id)];
    },
  },

  edit: {
    headers: { cacheInvalidate: true },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'products', method: 'edit' },
    async query(frame: Frame): Promise<TierCheckoutResult> {
      await tiersService.checkout.edit(
        actingContext(frame.options.context),
        frame.options.id,
        frame.data.tiers_checkout_config?.[0] ?? {},
      );
      return [await forTier(frame.options.id)];
    },
  },
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
