import type { Knex } from 'knex';
import type { ChangeEvents } from '../../lib/change-events';
import type { AppInstallationEvent } from '../app-installations/events';
import type { GiftLinkEvent } from '../gift-links/events';
import type { MetafieldDefinitionEvent } from '../members-metafields/events';
import type { CheckoutConfigEvent } from '../stripe-checkout-config/events';
import type { ActionLog } from './action-log';
import { appInstallationActionLog } from './app-installations';
import { giftLinkActionLog } from './gift-links';
import { ActionKind } from './kinds';
import { memberCustomFieldActionLog } from './member-custom-fields';
import { stripeCheckoutConfigActionLog } from './stripe-checkout-config';

/** The change events each kind of action is logged from. Every kind must have them. */
interface KindEvents {
  app_installation: AppInstallationEvent;
  gift_link: GiftLinkEvent;
  member_custom_field: MetafieldDefinitionEvent;
  stripe_checkout_config: CheckoutConfigEvent;
}

/** For each kind, the service whose change events it logs. */
export type ActionLogSources = {
  [K in ActionKind]: { events: Pick<ChangeEvents<KindEvents[K]>, 'react'> };
};

/** How each kind is logged. Every kind must have one, which the compiler checks. */
const ACTION_LOGS: { [K in ActionKind]: ActionLog<KindEvents[K]> } = {
  app_installation: appInstallationActionLog,
  gift_link: giftLinkActionLog,
  member_custom_field: memberCustomFieldActionLog,
  stripe_checkout_config: stripeCheckoutConfigActionLog,
};

/** Logs other services' change events as actions. */
export class ActionLogService {
  private knex: Knex;
  private sources: ActionLogSources;
  private stops: Array<() => void> = [];

  constructor({ knex, sources }: { knex: Knex; sources: ActionLogSources }) {
    this.knex = knex;
    this.sources = sources;
  }

  /** Starts logging every kind's change events as actions. */
  listen(): void {
    for (const kind of ActionKind.options) {
      this.stops.push(this.listenTo(kind));
    }
  }

  /** Stops logging, removing every reaction `listen` added. */
  stopListening(): void {
    for (const stop of this.stops.splice(0)) {
      stop();
    }
  }

  private listenTo<K extends ActionKind>(kind: K): () => void {
    return ACTION_LOGS[kind].listen(this.knex, kind, this.sources[kind].events);
  }
}
