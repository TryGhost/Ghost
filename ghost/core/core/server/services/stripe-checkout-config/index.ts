import urlUtils from '../../../shared/url-utils';
import { CheckoutBrandingService } from './branding-service';
import { CheckoutPreviewService, type PreviewableTier } from './preview-service';
import { checkoutConfigEvents } from './events';
import { StripeCheckoutConfigService } from './service';

export { StripeCheckoutConfigService } from './service';
export type { StripeCheckoutBranding, StripeCheckoutConfig, StripeCheckoutDesign } from './models';
export { CheckoutBrandingService } from './branding-service';
export { CheckoutPreviewService } from './preview-service';
export {
  toCheckoutBrandingResponse,
  toCheckoutConfigResponse,
  toCheckoutPreviewResponse,
} from './serializers';
export { actingContext } from '../../lib/actor';
export type { RequestContext } from '../../lib/actor';

// Constructed by init() at boot, not at import: knex is only available once the DB has
// connected.
export let service: StripeCheckoutConfigService | undefined;
export let previewService: CheckoutPreviewService<PreviewableTier> | undefined;
export let brandingService: CheckoutBrandingService | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  service = new StripeCheckoutConfigService({ knex, events: checkoutConfigEvents });

  // Looked up on each use: Stripe, tiers and members are set up later in boot.
  previewService = new CheckoutPreviewService({
    stripeConnected: () => require('../stripe').api.configured,
    readTier: (id) => require('../tiers').api.read(id),
    // The same checkout a signup by someone who isn't a member yet gets, in the given design.
    createPreviewLink: ({ tier, cadence, design, returnUrl, expiresInSeconds }) =>
      require('../members').api.paymentsService.getPaymentLink({
        tier,
        cadence,
        design,
        successUrl: returnUrl,
        cancelUrl: returnUrl,
        expiresInSeconds,
        metadata: { ghost_checkout_preview: true },
      }),
    siteUrl: () => urlUtils.urlFor('home', true),
  });

  brandingService = new CheckoutBrandingService({
    stripeConnected: () => require('../stripe').api.configured,
    readBranding: () => require('../stripe').api.getCheckoutBranding(),
  });
}
