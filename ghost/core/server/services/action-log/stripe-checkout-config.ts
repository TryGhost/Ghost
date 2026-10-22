import type { StripeCheckoutConfig } from '../stripe-checkout-config/models';
import type { CheckoutConfigEvent } from '../stripe-checkout-config/events';
import { createActionLog } from './action-log';

export const stripeCheckoutConfigActionLog = createActionLog<
  StripeCheckoutConfig,
  CheckoutConfigEvent
>({
  idOf: (_config, event) => event.configId,
  describe: (event) => {
    switch (event.type) {
      case 'CheckoutConfigSaved':
        // The config has no name of its own, so the action is named after what it configures.
        return { name: 'Stripe Checkout' };
    }
  },
});
