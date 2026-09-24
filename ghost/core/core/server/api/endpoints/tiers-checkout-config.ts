import { actingContext } from '../../services/members-metafields';
import { emptyCheckoutConfig } from '../../services/tier-checkout-config';
import type { TierCheckoutConfig } from '../../services/tier-checkout-config';

const tiersService = require('../../services/tiers');
const membersService = require('../../services/members');
const urlUtils = require('../../../shared/url-utils').default;

interface Frame {
  data: {
    tiers_checkout_config?: unknown[];
    // POC preview request
    config?: unknown;
    branding?: object;
    cadence?: string;
  };
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

/** POC: creates the hosted preview session; kept out of the controller to stay thin. */
async function previewSession(frame: Frame) {
  const tier = await tiersService.api.read(frame.options.id);
  const checkout = await tiersService.checkout.resolveDraft(frame.data.config ?? {});
  const membersApi = await membersService.api;
  const url = await membersApi.paymentsService.createCheckoutPreviewSession({
    tier,
    cadence: frame.data.cadence === 'year' ? 'year' : 'month',
    checkout,
    branding: frame.data.branding ?? {},
    returnUrl: urlUtils.getSiteUrl(),
  });
  return { url };
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

  /**
   * POC: a real, hosted Stripe Checkout Session for a tier, built from the unsaved
   * checkout configuration and branding in the request. Admin opens its URL in a new tab
   * (Stripe refuses to run Checkout in an iframe). Same session builder as a live signup.
   * Not yet validated: the tier (free, archived or unknown ids error) and the branding.
   */
  preview: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'products', method: 'edit' },
    query(frame: Frame) {
      return previewSession(frame);
    },
  },
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
