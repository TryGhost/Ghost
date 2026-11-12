import type {
  StripeCheckoutConfigChange,
  StripeCheckoutConfigReactions,
} from '../stripe-checkout-config/changes';
import type { Action, ActionLog } from './action-log';

/**
 * Logs saves of the Stripe Checkout config as staff actions. This is the only place that knows
 * how a save reads in Admin's History; the config service only says what happened.
 */
export function stripeCheckoutConfigActions(actionLog: ActionLog): StripeCheckoutConfigReactions {
  return {
    async onStripeCheckoutConfigUpdated(trx, context, change) {
      await actionLog.write(trx, context, actionFor(change));
    },
  };
}

function actionFor(change: StripeCheckoutConfigChange): Action {
  switch (change.type) {
    case 'StripeCheckoutConfigSaved':
      return {
        resourceType: 'stripe_checkout_config',
        event: 'edited',
        resourceId: change.configId,
        // The config has no name of its own, so the action is named after what it configures.
        context: { primary_name: 'Stripe Checkout' },
      };
  }
}
