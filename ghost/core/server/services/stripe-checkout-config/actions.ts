import logging from '@tryghost/logging';
import { z } from 'zod';

export interface Actor {
  id: string;
  type: 'user';
}

export interface RequestContext {
  actor: Actor | null;
}

const FrameContext = z.object({
  user: z.string().nullish(),
  integration: z.unknown(),
});

/**
 * Who is saving the config, read off an API frame's context.
 *
 * Only a staff user counts, whether signed in or using their own staff token. Integrations
 * can't reach the config, so they never get this far.
 */
export function actingContext(context: unknown): RequestContext {
  const frame = FrameContext.safeParse(context);
  if (frame.success && frame.data.user && !frame.data.integration) {
    return { actor: { id: frame.data.user, type: 'user' } };
  }
  return { actor: null };
}

export interface ActionRecorder {
  add(data: Record<string, unknown>, options: { autoRefresh: boolean }): Promise<unknown>;
}

// `subject` is the config row's id.
export type RecordCheckoutConfigAction = (input: {
  context: RequestContext;
  subject: string;
}) => Promise<void>;

/**
 * Records a save of the config in the staff history. The write is best-effort: a failed
 * action must never fail the save that triggered it.
 */
export async function recordCheckoutConfigAction({
  Action,
  context,
  subject,
}: {
  Action: ActionRecorder;
  context: RequestContext;
  subject: string;
}): Promise<void> {
  if (!context.actor) {
    return;
  }
  try {
    await Action.add(
      {
        event: 'edited',
        resource_type: 'stripe_checkout_config',
        resource_id: subject,
        actor_type: context.actor.type,
        actor_id: context.actor.id,
        // The config has no name of its own, so the entry is named after what it configures.
        context: { primary_name: 'Stripe Checkout' },
      },
      { autoRefresh: false },
    );
  } catch (err) {
    logging.error(
      {
        event: { name: 'stripe_checkout.config.action_log_failed' },
        err,
        subject,
        actorId: context.actor.id,
      },
      'Failed to record a Stripe Checkout config action',
    );
  }
}
