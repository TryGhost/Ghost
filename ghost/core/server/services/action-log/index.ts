import errors from '@tryghost/errors';
import { defineService } from '../../../kernel/define-service';
import appInstallations from '../app-installations';
import * as giftLinks from '../gift-links';
import * as metafields from '../members-metafields';
import stripeCheckoutConfig from '../stripe-checkout-config';
import { ActionLogService } from './service';

export type { ActionKind } from './kinds';

/** A service the action log listens to, which boot must have set up first. */
function initialised<Service>(service: Service | undefined, name: string): Service {
  if (service === undefined) {
    throw new errors.IncorrectUsageError({
      message: `${name} must be set up before the action log.`,
    });
  }
  return service;
}

export default defineService('Action Log', () => {
  const { knex } = require('../../data/db');
  const service = new ActionLogService({
    knex,
    sources: {
      app_installation: appInstallations.service,
      gift_link: initialised(giftLinks.service, 'The gift links service'),
      member_custom_field: initialised(metafields.definitions, 'The custom field definitions'),
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
