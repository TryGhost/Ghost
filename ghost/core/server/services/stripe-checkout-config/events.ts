import type { Edited } from '../../lib/change-events';
import type { StripeCheckoutConfig } from './models';

/** The config's row, which an action about a save loads the config from. */
interface SavedRow {
  configId: string;
}

/** What happens to the site-wide Stripe Checkout config. */
export type CheckoutConfigEvent = Edited<'CheckoutConfigSaved', StripeCheckoutConfig, SavedRow>;
