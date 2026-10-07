import { ActionKind } from './kinds';
import type { ActionLog } from './action-log';
import { appInstallationActionLog } from './app-installations';
import { giftLinkActionLog } from './gift-links';
import { memberCustomFieldActionLog } from './member-custom-fields';
import { stripeCheckoutConfigActionLog } from './stripe-checkout-config';

export { ACTION_KIND_TABLES, ActionKind } from './kinds';

/** How each kind is logged. Every kind must have one, which the compiler checks. */
const ACTION_LOGS = {
  app_installation: appInstallationActionLog,
  gift_link: giftLinkActionLog,
  member_custom_field: memberCustomFieldActionLog,
  stripe_checkout_config: stripeCheckoutConfigActionLog,
} as const satisfies Record<ActionKind, ActionLog>;

let listening = false;

/**
 * Starts logging every kind's change events as actions. Boot calls this once the database is
 * ready.
 */
export function init(): void {
  if (listening) {
    return;
  }

  const { knex } = require('../../data/db');
  for (const kind of ActionKind.options) {
    ACTION_LOGS[kind].listen(knex, kind);
  }
  listening = true;
}
