import type {
  OnStripeCheckoutConfigUpdated,
  StripeCheckoutConfigChange,
} from '../../services/stripe-checkout-config/changes';
import type { ActionLog, ActionRow } from './action-log';

type StripeCheckoutConfigAction = Extract<ActionRow, { resourceType: 'stripe_checkout_config' }>;

/**
 * Logs the changes the Stripe Checkout config service reports. This is the only place that knows
 * how a save reads in Admin's History; the service only says what happened.
 */
export function recordStripeCheckoutConfigChanges(
  actionLog: ActionLog,
): OnStripeCheckoutConfigUpdated {
  return async (trx, context, change) => {
    await actionLog.record(trx, context, actionFor(change));
  };
}

function actionFor(change: StripeCheckoutConfigChange): StripeCheckoutConfigAction {
  switch (change.type) {
    case 'StripeCheckoutConfigSaved':
      return {
        resourceType: 'stripe_checkout_config',
        event: 'edited',
        resourceId: change.configId,
        // The config has no name of its own, so the action is named after what it configures.
        primaryName: 'Stripe Checkout',
      };
  }
}
