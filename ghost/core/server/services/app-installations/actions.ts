import logging from '@tryghost/logging';

export interface Actor {
  id: string;
  type: 'user';
}

export interface RequestContext {
  actor: Actor | null;
}

/**
 * Who is acting, read off an API frame's context.
 *
 * Only a staff user counts, whether signed in or using their own staff token.
 * Integrations hold no permission to manage apps, so they never get this far.
 */
export function actingContext(context: unknown): RequestContext {
  const frame = (context ?? {}) as { user?: string; integration?: unknown };
  if (frame.user && !frame.integration) {
    return { actor: { id: frame.user, type: 'user' } };
  }
  return { actor: null };
}

export interface ActionRecorder {
  add(data: Record<string, unknown>, options: { autoRefresh: boolean }): Promise<unknown>;
}

export type AppInstallationEvent = 'installed' | 'uninstalled' | 'changes_approved';

export interface AppInstallationActionDetails {
  primary_name: string;
  app_id: string;
  /** For an approval: the manifest that was approved before, and the one approved now. */
  from_manifest_id?: string;
  to_manifest_id?: string;
}

// `subject` is the installation's id. The app's name and ID ride along in the action's
// context, so the history still reads as "Podcast" long after the manifest has changed.
export type RecordAppInstallationAction = (input: {
  context: RequestContext;
  event: AppInstallationEvent;
  subject: string;
  details: AppInstallationActionDetails;
}) => Promise<void>;

/**
 * Staff history is where "who installed this, and when" lives; the installation itself
 * does not hold it. The write is best-effort: a failed action must never fail the install
 * or uninstall that triggered it.
 */
export async function recordAppInstallationAction({
  Action,
  context,
  event,
  subject,
  details,
}: {
  Action: ActionRecorder;
  context: RequestContext;
  event: AppInstallationEvent;
  subject: string;
  details: AppInstallationActionDetails;
}): Promise<void> {
  if (!context.actor) {
    return;
  }
  try {
    await Action.add(
      {
        event,
        resource_type: 'app_installation',
        resource_id: subject,
        actor_type: context.actor.type,
        actor_id: context.actor.id,
        context: details,
      },
      { autoRefresh: false },
    );
  } catch (err) {
    logging.error(err);
  }
}
