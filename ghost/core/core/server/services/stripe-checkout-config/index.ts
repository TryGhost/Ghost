import urlUtils from '../../../shared/url-utils';
import { CheckoutPreviewService, type PreviewableTier } from './preview-service';
import { recordCheckoutConfigAction, type RecordCheckoutConfigAction } from './actions';
import { StripeCheckoutConfigService } from './service';

export { StripeCheckoutConfigService } from './service';
export type { StripeCheckoutConfig, StripeCheckoutDesign } from './models';
export { CheckoutPreviewService } from './preview-service';
export { toCheckoutConfigResponse, toCheckoutPreviewResponse } from './serializers';
export { actingContext } from './actions';
export type { RequestContext } from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has
// connected.
export let service: StripeCheckoutConfigService | undefined;
export let previewService: CheckoutPreviewService<PreviewableTier> | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordCheckoutConfigAction = (input) =>
    recordCheckoutConfigAction({ Action: models.Action, ...input });
  service = new StripeCheckoutConfigService({ knex, recordAction });

  // Looked up when a preview is made: Stripe, tiers and members are set up later in boot.
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
}
