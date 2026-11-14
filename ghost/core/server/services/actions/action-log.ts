import ObjectID from 'bson-objectid';
import type { GhostLogger } from '@tryghost/logging';
import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import { toDatabaseDate } from '../../lib/db-types/date';

/**
 * The kinds of resource the action log holds actions about, each with the events it may store.
 * A kind is stored as an action's `resource_type`.
 *
 * Each kind is written by one file beside this one, which turns a domain's changes into actions.
 * No domain builds an action itself. Bookshelf models log their own actions and have no kind
 * here.
 */
export interface ActionEvents {
  gift_link: 'added' | 'edited' | 'deleted';
  member_custom_field: 'added' | 'edited' | 'archived' | 'restored' | 'deleted';
  stripe_checkout_config: 'edited';
}

export type ActionKind = keyof ActionEvents;

/** An action to store: what happened to which resource, as Admin's History page reads it. */
export type Action = {
  [Kind in ActionKind]: {
    resourceType: Kind;
    event: ActionEvents[Kind];
    /** The resource the action is about, or null for an action that belongs to no single one. */
    resourceId: string | null;
    /** Anything else stored with the action, such as the name History shows for it. */
    context?: Record<string, unknown>;
  };
}[ActionKind];

/**
 * Stores staff actions in the `actions` table, which Admin's History page reads.
 *
 * An action is part of the change it records, so it is written in the command's transaction: it
 * is kept when the change is kept and never without it. A failed write is logged and then
 * thrown, so it fails the command and the change is rolled back with it.
 */
export class ActionLog {
  private logging: Pick<GhostLogger, 'error'>;

  constructor({ logging }: { logging: Pick<GhostLogger, 'error'> }) {
    this.logging = logging;
  }

  /**
   * Stores an action by whoever `context` says is acting. Nothing is stored for a request that
   * has no actor.
   */
  async write(trx: Knex.Transaction, context: RequestContext, action: Action): Promise<void> {
    const { actor } = context;
    if (!actor) {
      return;
    }
    try {
      await trx('actions').insert({
        // ObjectIDs increase over time, which readers rely on to order actions within a second.
        id: new ObjectID().toHexString(),
        resource_id: action.resourceId,
        resource_type: action.resourceType,
        actor_id: actor.id,
        actor_type: actor.type,
        event: action.event,
        context: action.context === undefined ? null : JSON.stringify(action.context),
        created_at: toDatabaseDate(new Date()),
      });
    } catch (err) {
      this.logging.error(
        {
          event: { name: 'action_log.write_failed' },
          err,
          resourceType: action.resourceType,
          resourceId: action.resourceId,
          action: action.event,
          actorType: actor.type,
          actorId: actor.id,
        },
        'Failed to write an action to the action log',
      );
      throw err;
    }
  }
}
