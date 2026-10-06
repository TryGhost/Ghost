import errors from '@tryghost/errors';
import * as metafields from '../members-metafields';
import { StripeCheckoutConfigService } from './service';

/**
 * How Stripe Checkout looks and what it collects beyond the payment, set once for the site.
 *
 * Each section names the paid tiers it applies to, or none to cover every paid tier, so a
 * tier's checkout is worked out from this rather than configured on the tier. Read live on
 * every checkout, because archiving or deleting a custom field changes what can be collected
 * without this service hearing about it.
 */
export { StripeCheckoutConfigService } from './service';
export type { ResolvedCheckout, StripeCheckoutConfig, StripeCheckoutDesign } from './models';
export { toCheckoutConfigResponse, requirementsByTier, type TierRequirements } from './serializers';

// Constructed by init() at boot, not at import: knex is only available once the DB has
// connected, and the metafields services it binds through are built just before it.
export let service: StripeCheckoutConfigService | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { bindings, definitions } = metafields;
  if (!bindings || !definitions) {
    throw new errors.InternalServerError({
      message: 'The metafields services must be initialised before Stripe checkout config.',
    });
  }

  const { knex } = require('../../data/db');
  service = new StripeCheckoutConfigService({ knex, bindings, fields: definitions });
}
