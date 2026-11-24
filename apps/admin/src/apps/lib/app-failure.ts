import {
  type AppFailureCode,
  isAppFailureCode,
  isUnconfirmedAppCode,
} from '@tryghost/app-contracts';
import { APIError } from '@tryghost/admin-x-framework/errors';

/**
 * What Ghost said about a failed apps request: the first error's code, and its type for an error
 * without one. Every decision about what an apps failure means reads this, never the status: an
 * unrelated error can share a status with one that ends a session.
 */
export interface Failure {
  code?: string;
  type?: string;
}

function failureOfBody(body: unknown): Failure | undefined {
  const errors = (body as { errors?: unknown } | null | undefined)?.errors;
  const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
  if (typeof first !== 'object' || first === null) {
    return undefined;
  }
  const { code, type } = first as { code?: unknown; type?: unknown };
  return {
    code: typeof code === 'string' && code ? code : undefined,
    type: typeof type === 'string' && type ? type : undefined,
  };
}

/** What Ghost said about a request Admin's API layer failed with. */
export function failureOf(error: unknown): Failure | undefined {
  return error instanceof APIError ? failureOfBody(error.data) : undefined;
}

/** What Ghost said in a failed response Admin sent for an app, read from a copy of its body. */
export async function failureOfResponse(response: Response): Promise<Failure | undefined> {
  if (response.ok) {
    return undefined;
  }
  try {
    return failureOfBody(await response.clone().json());
  } catch {
    return undefined;
  }
}

/** Ghost refused the call's app token, rather than the call itself. */
export function isRefusedToken(failure: Failure | undefined): boolean {
  return failure?.code === 'APP_TOKEN_INVALID';
}

/**
 * Why no app opens on this site, whichever app it is: it runs the legacy auth engine, which can't
 * issue the tokens apps need, the apps flag was turned on since Ghost started, or it's off.
 */
export type SiteBlocksApps = 'new-auth-engine' | 'restart' | 'off';

const SITE_BLOCKS_APPS: Partial<Record<AppFailureCode, SiteBlocksApps>> = {
  APP_AUTH_ENGINE_UNSUPPORTED: 'new-auth-engine',
  APP_TOKENS_UNAVAILABLE: 'restart',
};

/**
 * Ghost turns the apps routes away with a 404 that has no code while the `apps` flag is off. The
 * routes that start a session and renew its token answer an installation that doesn't exist with
 * `APP_NOT_INSTALLED`, so from them, a 404 without a code means apps are off.
 */
function appsTurnedOff(failure: Failure | undefined): boolean {
  return failure?.type === 'NotFoundError' && failure.code === undefined;
}

/** Why no app opens on this site, read from a failed session start. */
export function siteBlocksApps(error: unknown): SiteBlocksApps | undefined {
  const failure = failureOf(error);
  if (appsTurnedOff(failure)) {
    return 'off';
  }
  return isAppFailureCode(failure?.code) ? SITE_BLOCKS_APPS[failure.code] : undefined;
}

/**
 * Ghost won't open apps for the staff user: their role doesn't allow it, such as after they were
 * made an Editor while an app was open.
 */
export function refusesStaffUser(error: unknown): boolean {
  return failureOf(error)?.code === 'APP_STAFF_SESSION_REQUIRED';
}

/** Codes that end an open app session: nothing it can do opens it again as it was. */
const ENDS_SESSION: ReadonlySet<string> = new Set<AppFailureCode>([
  'APP_SESSION_ENDED',
  'APP_NOT_INSTALLED',
  'APP_STAFF_SESSION_REQUIRED',
  'APP_AUTH_ENGINE_UNSUPPORTED',
  'APP_TOKENS_UNAVAILABLE',
]);

/**
 * Whether Ghost refused a renewal for good: the installation changed or is gone, the site can't
 * issue app tokens or has apps turned off, or the staff user may no longer open apps.
 */
export function endsAppSession(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    (failure?.code !== undefined && ENDS_SESSION.has(failure.code)) ||
    failure?.type === 'NoPermissionError' ||
    appsTurnedOff(failure)
  );
}

/** Why starting a session failed, when Ghost couldn't use the app's manifest. */
export interface SessionFailure {
  /** The failure's own code, which the screen shows so the publisher can pass it on. */
  code: string;
  /**
   * Ghost couldn't confirm it's the app that was installed, rather than the app being down or
   * broken. The publisher is told to contact the developer, not to install it again.
   */
  unconfirmed: boolean;
}

/**
 * Why starting a session failed, if it was because of the app. Nothing changed, so trying again
 * opens the app once it's fixed.
 */
export function sessionFailureOf(error: unknown): SessionFailure | undefined {
  const code = failureOf(error)?.code;
  if (!isAppFailureCode(code) || ENDS_SESSION.has(code)) {
    return undefined;
  }
  return { code, unconfirmed: isUnconfirmedAppCode(code) };
}
