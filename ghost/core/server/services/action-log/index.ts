import { defineService } from '../../../kernel/define-service';
import appInstallations from '../app-installations';
import giftLinks from '../gift-links';
import * as metafields from '../members-metafields';
import stripeCheckoutConfig from '../stripe-checkout-config';
import { ActionLogService } from './service';

export type { ActionKind } from './kinds';

export default defineService('Action Log', () => {
  const { knex } = require('../../data/db');
  const service = new ActionLogService({
    knex,
    sources: {
      app_installation: appInstallations.service,
      gift_link: giftLinks.service,
      member_custom_field: metafields.booted().definitions,
      stripe_checkout_config: stripeCheckoutConfig.service.config,
    },
  });

  try {
    service.listen();
  } catch (error) {
    service.stopListening();
    throw error;
  }
  return service;
});
