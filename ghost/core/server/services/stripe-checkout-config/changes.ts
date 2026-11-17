import type { Edited, OnUpdated } from '../../lib/changes';
import type { StripeCheckoutConfig } from './models';

/**
 * A change a command made to the site-wide Stripe Checkout config, in the service's own terms.
 * A save is an edit of the one config a site has, from the config as it was to the config as it
 * is now. `configId` is the id of the row the config is stored in, which the config itself does
 * not hold.
 */
export type StripeCheckoutConfigChange = Edited<
  'StripeCheckoutConfigSaved',
  StripeCheckoutConfig,
  { configId: string }
>;

/** The function the Stripe Checkout config service calls with each change it makes. */
export type OnStripeCheckoutConfigUpdated = OnUpdated<StripeCheckoutConfigChange>;
