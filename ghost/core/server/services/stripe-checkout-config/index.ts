import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import urlUtils from '../../../shared/url-utils';
import * as metafields from '../members-metafields';
import {
  actingContext,
  recordCheckoutConfigAction,
  type RecordCheckoutConfigAction,
} from './actions';
import { CheckoutBrandingService } from './branding-service';
import { CheckoutPreviewService, type PreviewableTier } from './preview-service';
import { StripeCheckoutConfigService } from './service';

export type { RequestContext } from './actions';
export type { CheckoutBrandingService } from './branding-service';
export type { CheckoutPreviewService } from './preview-service';
export type { StripeCheckoutConfigService } from './service';
export type {
  CheckoutCollection,
  CheckoutSessionConfig,
  CollectionParams,
  StripeCheckoutBranding,
  StripeCheckoutConfig,
  StripeCheckoutDesign,
} from './models';

/** The Stripe Checkout services, built together once the database and custom fields are ready. */
export interface StripeCheckoutServices {
  /** Reads and saves the site-wide config. */
  config: StripeCheckoutConfigService;
  /** Opens real Stripe Checkout pages for settings not saved yet. */
  previews: CheckoutPreviewService<PreviewableTier>;
  /** Reads the branding set in the Stripe dashboard. */
  branding: CheckoutBrandingService;
}

const extras = { actingContext };

// Constructed by init() at boot, not at import: knex is only available once the DB has
// connected.
export default defineService(
  'Stripe Checkout Config',
  (): StripeCheckoutServices => {
    const { knex } = require('../../data/db');
    const models = require('../../models');

    // Boot sets up the custom fields services first, as shipping saves into custom fields.
    if (!metafields.bindings) {
      throw new errors.IncorrectUsageError({
        message: 'The custom fields services must be set up before the Stripe Checkout config.',
      });
    }
    const recordAction: RecordCheckoutConfigAction = (input) =>
      recordCheckoutConfigAction({ Action: models.Action, logging, ...input });

    return {
      config: new StripeCheckoutConfigService({
        knex,
        recordAction,
        bindings: metafields.bindings,
        logging,
      }),
      // Looked up on each use: Stripe, tiers and members are set up later in boot.
      previews: new CheckoutPreviewService({
        stripeConnected: () => require('../stripe').api.configured,
        readTier: (id) => require('../tiers').api.read(id),
        // The same checkout a signup by someone who isn't a member yet gets, in the given design.
        createPreviewLink: ({ tier, cadence, design, collection, returnUrl, expiresInSeconds }) =>
          require('../members').api.paymentsService.getPaymentLink({
            tier,
            cadence,
            design,
            collection,
            successUrl: returnUrl,
            cancelUrl: returnUrl,
            expiresInSeconds,
            metadata: { ghost_checkout_preview: true },
          }),
        siteUrl: () => urlUtils.urlFor('home', true),
      }),
      branding: new CheckoutBrandingService({
        stripeConnected: () => require('../stripe').api.configured,
        readBranding: () => require('../stripe').api.getCheckoutBranding(),
        logging,
      }),
    };
  },
  extras,
);
