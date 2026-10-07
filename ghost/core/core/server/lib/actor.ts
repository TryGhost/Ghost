import errors from '@tryghost/errors';
import { z } from 'zod';

/** Who made a change: a staff user, or an integration through its API key. */
export interface Actor {
  type: 'user' | 'integration';
  id: string;
}

/** What a command knows about the request that called it. */
export interface RequestContext {
  actor: Actor;
}

/** Who an API request authenticated as, read from an API frame's context. */
export interface FrameIdentity {
  /** The staff user the request authenticated as, by session or staff token. */
  userId: string | null;
  /** The integration whose API key authenticated the request. */
  integrationId: string | null;
  /** An API key rather than a signed-in session, which a user's staff token also is. */
  viaApiKey: boolean;
}

/**
 * The parts of an API frame's context that say who made the request. A part that is missing
 * or malformed reads as absent, without affecting the others.
 */
const FrameContext = z.object({
  user: z.string().min(1).nullish().catch(null),
  integration: z
    .object({ id: z.string().min(1) })
    .nullish()
    .catch(null),
  api_key: z.unknown(),
});

/** Reads who an API request authenticated as from its frame's context. */
export function readFrameIdentity(context: unknown): FrameIdentity {
  const frame = FrameContext.safeParse(context ?? {});
  if (!frame.success) {
    return { userId: null, integrationId: null, viaApiKey: false };
  }
  return {
    userId: frame.data.user ?? null,
    integrationId: frame.data.integration?.id ?? null,
    viaApiKey: Boolean(frame.data.api_key),
  };
}

/**
 * Who made a request: the integration whose API key made it, or otherwise the staff user,
 * whether they signed in or used a staff token. Null when there is neither.
 */
export function actorFrom(identity: FrameIdentity): Actor | null {
  if (identity.integrationId) {
    return { type: 'integration', id: identity.integrationId };
  }
  if (identity.userId) {
    return { type: 'user', id: identity.userId };
  }
  return null;
}

/**
 * Reads who made a request from an API frame's context.
 *
 * Throws when there is nobody. Every authenticated Admin API request has an actor, so a
 * request without one is a bug in the caller.
 */
export function actorOf(context: unknown): Actor {
  const actor = actorFrom(readFrameIdentity(context));
  if (!actor) {
    throw new errors.InternalServerError({
      message: 'A change was made without a staff user or integration.',
    });
  }
  return actor;
}

/** Reads the context a command needs from an API frame's context. */
export function actingContext(context: unknown): RequestContext {
  return { actor: actorOf(context) };
}
