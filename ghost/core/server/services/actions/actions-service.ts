import type { GhostLogger } from '@tryghost/logging';
import type { GiftLinkReactions } from '../gift-links/changes';
import type { CustomFieldReactions } from '../members-metafields/changes';
import type { StripeCheckoutConfigReactions } from '../stripe-checkout-config/changes';
import { ActionLog } from './action-log';
import { customFieldActions } from './custom-fields';
import { giftLinkActions } from './gift-links';
import { stripeCheckoutConfigActions } from './stripe-checkout-config';

interface ActionsServiceDeps {
  logging: GhostLogger;
}

/**
 * Staff actions: the record of what a staff user or integration did, stored in the `actions`
 * table and read by Admin's History page through the actions API.
 *
 * A service that reports its changes is given the member of this service named after it, as the
 * function it calls with each change. That function writes the action inside the command's
 * transaction. No other service builds an action or knows how one is stored.
 *
 * Bookshelf models log their own actions and do not go through this service.
 */
export class ActionsService {
  readonly logging: GhostLogger;
  /** Logs the changes the gift links service makes. */
  readonly giftLinks: GiftLinkReactions;
  /** Logs the changes the custom field definitions service makes. */
  readonly customFields: CustomFieldReactions;
  /** Logs the saves the Stripe Checkout config service makes. */
  readonly stripeCheckoutConfig: StripeCheckoutConfigReactions;

  constructor({ logging }: ActionsServiceDeps) {
    this.logging = logging;
    const actionLog = new ActionLog({ logging });
    this.giftLinks = giftLinkActions(actionLog);
    this.customFields = customFieldActions(actionLog);
    this.stripeCheckoutConfig = stripeCheckoutConfigActions(actionLog);
  }
}
