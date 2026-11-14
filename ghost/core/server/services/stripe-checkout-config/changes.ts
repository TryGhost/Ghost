import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import type { Edited } from '../../lib/changes';
import type { StripeCheckoutConfig } from './models';

/** A change a command made to the site's Stripe Checkout config, in the service's own terms. */
export type StripeCheckoutConfigChange =
  /**
   * The config was saved. `configId` is the id of the row that holds the site's one config,
   * which the config itself doesn't carry.
   */
  Edited<'StripeCheckoutConfigSaved', StripeCheckoutConfig, { configId: string }>;

/**
 * What the Stripe Checkout config service tells about each change it makes. The service's root
 * supplies it, and the service knows nothing about who is told or what they do with a change.
 *
 * `onStripeCheckoutConfigUpdated` is called inside the command's transaction, after the change
 * is written. What it writes through `trx` is saved with the change, and if it throws, the
 * command fails and the change is rolled back.
 */
export interface StripeCheckoutConfigReactions {
  onStripeCheckoutConfigUpdated(
    trx: Knex.Transaction,
    context: RequestContext,
    change: StripeCheckoutConfigChange,
  ): Promise<void>;
}
