import { z } from 'zod';

/** Who made a change: a staff user, or an integration through its API key. */
export interface Actor {
  type: 'user' | 'integration';
  id: string;
}

/** What a command knows about the request that called it. Null when nobody is acting. */
export interface RequestContext {
  actor: Actor | null;
}

/**
 * Who an API request authenticated as, read from an API frame's context.
 *
 * The framework's HTTP adapter builds the context from the request: `user` is the staff
 * user's id, `integration` carries the integration an API key belongs to, and `api_key` is
 * present whenever an API key rather than a session authenticated the request. A staff token
 * is an API key with a user and no integration, so "user" and "via API key" are independent.
 */
export interface FrameIdentity {
  /** The staff user the request authenticated as, by session or staff token. */
  userId: string | null;
  /** The integration whose API key authenticated the request. */
  integrationId: string | null;
  /** An API key rather than a signed-in session, which a user's staff token also is. */
  viaApiKey: boolean;
}

// A part that is missing or malformed reads as absent, without affecting the others.
const FrameContext = z.object({
  user: z.string().min(1).nullish().catch(null),
  integration: z
    .object({ id: z.string().min(1) })
    .nullish()
    .catch(null),
  api_key: z.unknown().optional(),
});

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
 * whether they signed in or used a staff token. Null when there is neither, as for a webhook
 * or a job. Bookshelf's `getActor` reads the same order.
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

/** Reads the context a command needs from an API frame's context. */
export function actingContext(context: unknown): RequestContext {
  return { actor: actorFrom(readFrameIdentity(context)) };
}
