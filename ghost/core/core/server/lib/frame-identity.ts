/**
 * Who an API request authenticated as, read off an API frame's context.
 *
 * The framework's HTTP adapter (`@tryghost/api-framework`, `http.ts`) builds the context
 * from the request: `user` is the staff user's id, `integration` carries the integration an
 * API key belongs to, and `api_key` is present whenever an API key rather than a session
 * authenticated the request. A staff token is an API key with a user and no integration,
 * so "user" and "via API key" are independent facts, not alternatives.
 *
 * This reads the whole picture once. Each history-recording service narrows it to the
 * kind of actor it records, so the services differ only in that narrowing and never in
 * how they read the context.
 */
export interface FrameIdentity {
  /** The staff user the request authenticated as, by session or staff token. */
  userId: string | null;
  /** The integration whose API key authenticated the request. */
  integrationId: string | null;
  /** An API key rather than a signed-in session, which a user's staff token also is. */
  viaApiKey: boolean;
}

export function readFrameIdentity(context: unknown): FrameIdentity {
  const frame = (context ?? {}) as {
    user?: unknown;
    integration?: unknown;
    api_key?: unknown;
  };
  const integration = frame.integration as { id?: unknown } | null | undefined;
  return {
    userId: typeof frame.user === 'string' && frame.user ? frame.user : null,
    integrationId: typeof integration?.id === 'string' && integration.id ? integration.id : null,
    viaApiKey: Boolean(frame.api_key),
  };
}
