import { Edited, type OnUpdated } from '../../lib/changes';
import type { StripeCheckoutConfig } from './models';

/**
 * The site-wide Stripe Checkout config was saved. A save is an edit of the one config a site
 * has, from the config as it was to the config as it is now.
 */
export class StripeCheckoutConfigSaved extends Edited(
  'StripeCheckoutConfigSaved',
)<StripeCheckoutConfig> {
  /** The id of the row the config is stored in, which the config itself does not hold. */
  readonly configId: string;

  constructor(previous: StripeCheckoutConfig, next: StripeCheckoutConfig, configId: string) {
    super(previous, next);
    this.configId = configId;
  }
}

/** A change a command made to the Stripe Checkout config, in the service's own terms. */
export type StripeCheckoutConfigChange = StripeCheckoutConfigSaved;

/** The function the Stripe Checkout config service calls with each change it makes. */
export type OnStripeCheckoutConfigUpdated = OnUpdated<StripeCheckoutConfigChange>;
