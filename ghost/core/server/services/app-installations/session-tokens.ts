import type { AppFailureCode } from '@tryghost/app-contracts';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type {
  AppTokenRefusal,
  AppTokens,
  AppTokensAvailability,
} from '../../auth/better-auth/app-tokens';
import type { Principal } from '../../auth/principal';
import type { Installation } from './codec';
import { staffSessionOf, type StaffSession } from './staff-session';

/**
 * The user token Admin sends for the app, as `Authorization: Bearer`. It acts for the staff
 * user within the installation's approved scopes, and is bound to their staff session.
 */
export interface AppSessionToken {
  access_token: string;
  /** Seconds from when Ghost answered, so the browser's clock doesn't matter */
  expires_in: number;
}

/** Why app tokens can't be issued on this site, whichever app it is. */
function tokensUnavailable(availability: Exclude<AppTokensAvailability, 'ready'>) {
  switch (availability) {
    case 'legacy_engine':
      return new errors.ConflictError({
        message: 'Apps need Ghost’s new auth engine, auth:engine better-auth.',
        code: 'APP_AUTH_ENGINE_UNSUPPORTED' satisfies AppFailureCode,
      });
    case 'needs_restart':
      return new errors.ConflictError({
        message: 'Apps can’t open until Ghost restarts with the apps flag on.',
        code: 'APP_TOKENS_UNAVAILABLE' satisfies AppFailureCode,
      });
  }
}

/** Why no token could be issued for an installation that was active when it was read. */
function notIssued(refused: AppTokenRefusal) {
  switch (refused) {
    case 'client_unavailable':
      return new errors.InternalServerError({
        message: 'The app’s OAuth client is missing or disabled, so no token was issued.',
      });
    case 'user_not_found':
      return new errors.InternalServerError({
        message: 'The staff user was not found, so no app token was issued.',
      });
  }
}

/** The installation doesn't exist or has been uninstalled. */
function notInstalled() {
  return new errors.NotFoundError({
    message: 'This app is not installed.',
    code: 'APP_NOT_INSTALLED' satisfies AppFailureCode,
  });
}

/** The session can't go on: the installation was suspended, or changed since it started. */
function sessionEnded() {
  return new errors.ConflictError({
    message: 'This app session has ended.',
    code: 'APP_SESSION_ENDED' satisfies AppFailureCode,
  });
}

/**
 * The tokens an app session gets: who may have them, issuing and renewing them, and keeping
 * each installation's OAuth client in step with it. The installations service decides when a
 * session starts and what it shows; this decides what it's given to call Ghost with.
 */
export class AppSessionTokens {
  private appTokens: AppTokens;
  private findInstallation: (id: string) => Promise<Installation | undefined>;
  private logging: Pick<GhostLogger, 'error'>;

  constructor({
    appTokens,
    findInstallation,
    logging,
  }: {
    appTokens: AppTokens;
    /** The installation, unless it doesn't exist or has been uninstalled */
    findInstallation: (id: string) => Promise<Installation | undefined>;
    logging: Pick<GhostLogger, 'error'>;
  }) {
    this.appTokens = appTokens;
    this.findInstallation = findInstallation;
    this.logging = logging;
  }

  /**
   * The staff session an app session's tokens are bound to. Throws unless this site can issue
   * app tokens and the request is a verified staff session of a user who may open apps.
   */
  staffSessionFor(principal: Principal | null): StaffSession {
    const availability = this.appTokens.availability();
    if (availability !== 'ready') {
      throw tokensUnavailable(availability);
    }
    return staffSessionOf(principal);
  }

  /** A user token for an active installation, holding the scopes of its approved manifest. */
  async issue(installation: Installation, staff: StaffSession): Promise<AppSessionToken> {
    // The provider checks no scopes, so they come from the approved manifest
    const issued = await this.appTokens.issue({
      installationId: installation.id,
      userId: staff.userId,
      sessionId: staff.sessionId,
      scopes: installation.manifest.scopes,
    });
    if ('refused' in issued) {
      throw notIssued(issued.refused);
    }
    return { access_token: issued.accessToken, expires_in: issued.expiresIn };
  }

  /**
   * A fresh user token for a session started at `revision`, without fetching the manifest.
   * Nothing is stored. The same checks as starting a session, and the session must still be
   * current.
   */
  async renew(id: string, revision: number, principal: Principal | null): Promise<AppSessionToken> {
    const staff = this.staffSessionFor(principal);
    const installation = await this.findInstallation(id);
    if (!installation) {
      throw notInstalled();
    }
    if (installation.status !== 'active' || installation.revision !== revision) {
      throw sessionEnded();
    }
    return this.issue(installation, staff);
  }

  /**
   * Brings the installation's OAuth client in step once its own change has been made, outside
   * its transaction. A failure is logged rather than failing that change: every call with a
   * token checks the installation, so a client out of step grants nothing, and the next run
   * heals it. A client of an installation that isn't active is disabled and its tokens deleted.
   */
  async keepClientInStep(installation: Installation): Promise<void> {
    try {
      await this.appTokens.reconcileClient({
        id: installation.id,
        active: installation.status === 'active',
        scopes: installation.manifest.scopes,
      });
    } catch (err) {
      this.logging.error(err);
    }
  }
}
