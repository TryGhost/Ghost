import { z } from 'zod';
import type { Principal } from '../auth/principal';

/** Who made a change: a staff user, or an integration through its API key. */
export interface Actor {
  type: 'user' | 'integration';
  id: string;
}

/** What a command knows about the request that called it. Null when nobody is acting. */
export interface RequestContext {
  actor: Actor | null;
  /** The app installation the request came through, if an app made it. */
  appInstallationId?: string;
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

type AppPrincipal = Extract<Principal, { kind: 'app' }>;

// Tied to the app principal's type, so renaming its fields fails to compile instead of quietly
// recording no app.
const AppPrincipalFrame = z.object({
  principal: z.object({
    kind: z.literal('app'),
    app: z.object({ id: z.string().min(1) }),
  }),
}) satisfies z.ZodType<{
  principal: Pick<AppPrincipal, 'kind'> & { app: Pick<AppPrincipal['app'], 'id'> };
}>;

/** Reads the app installation a request came through from its app principal, if it has one. */
export function appInstallationIdFrom(context: unknown): string | undefined {
  const frame = AppPrincipalFrame.safeParse(context);
  return frame.success ? frame.data.principal.app.id : undefined;
}

/** Reads the context a command needs from an API frame's context. */
export function actingContext(context: unknown): RequestContext {
  const appInstallationId = appInstallationIdFrom(context);
  return {
    actor: actorFrom(readFrameIdentity(context)),
    ...(appInstallationId ? { appInstallationId } : {}),
  };
}
