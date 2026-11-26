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
import type { AppSessionToken } from './serializers';
import { staffSessionOf, staffSessionRequired, type StaffSession } from './staff-session';

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

/**
 * Why no token could be issued for an installation that is still active. A staff session that
 * ended meanwhile is the request's problem; anything else is Ghost's.
 */
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
    case 'session_unavailable':
      return staffSessionRequired();
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

  /**
   * An app user token for an installation that was active when read, holding the scopes of its
   * approved manifest. Null when it was suspended meanwhile, or given `atRevision`, moved to
   * another revision; throws when it was uninstalled.
   *
   * Its client follows the installation, so a suspension or uninstall that lands while issuing
   * either refuses the token or deletes it before it's stored. The installation is read again
   * after issuing so neither is answered with a token, or with an error of Ghost's.
   *
   * A client refused for an installation that is still active is out of step with it, which a
   * reconcile written from a stale read can leave behind. It's brought in step from the fresh
   * read and issued once more.
   */
  issue(
    installation: Installation,
    staff: StaffSession,
    { atRevision }: { atRevision?: number } = {},
  ): Promise<AppSessionToken | null> {
    return this.issueOnce(installation, staff, atRevision, { retry: true });
  }

  private async issueOnce(
    installation: Installation,
    staff: StaffSession,
    atRevision: number | undefined,
    { retry }: { retry: boolean },
  ): Promise<AppSessionToken | null> {
    // The provider checks no scopes, so they come from the approved manifest
    const issued = await this.appTokens.issue({
      installationId: installation.id,
      userId: staff.userId,
      sessionId: staff.sessionId,
      scopes: installation.manifest.scopes,
    });
    if ('refused' in issued) {
      if (issued.refused === 'client_unavailable') {
        const current = await this.stillActive(installation);
        if (!current || (atRevision !== undefined && current.revision !== atRevision)) {
          return null;
        }
        if (retry) {
          await this.reconcileClient(current.id, current);
          return this.issueOnce(installation, staff, atRevision, { retry: false });
        }
      }
      throw notIssued(issued.refused);
    }
    const current = await this.stillActive(installation);
    if (!current || (atRevision !== undefined && current.revision !== atRevision)) {
      return null;
    }
    return { access_token: issued.accessToken, expires_in: issued.expiresIn };
  }

  /**
   * The installation as it is now, or null when it's no longer active. Then its client is
   * brought in step again, which deletes any token issued meanwhile; when it's been
   * uninstalled, throws.
   */
  private async stillActive(installation: Installation): Promise<Installation | null> {
    const current = await this.findInstallation(installation.id);
    if (current?.status === 'active') {
      return current;
    }
    await this.reconcileClient(installation.id, current);
    if (!current) {
      throw notInstalled();
    }
    return null;
  }

  /**
   * A fresh app user token for a session started at `revision`, without fetching the manifest.
   * Nothing about the session is stored. The same checks as starting a session, and the
   * session must still be current.
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
    const token = await this.issue(installation, staff, { atRevision: revision });
    if (!token) {
      throw sessionEnded();
    }
    return token;
  }

  /**
   * Brings the installation's OAuth client in step with it as it is now, once a change to it
   * has been made, outside that change's transaction. A failure is logged rather than failing
   * the change: every call with a token checks the installation, so a client out of step
   * grants nothing, and the next run heals it. A client of an installation that isn't active,
   * or has been uninstalled, is disabled and its tokens deleted.
   */
  async keepClientInStep(id: string): Promise<void> {
    let installation: Installation | undefined;
    try {
      // Not atomic with the client write: a run that stalls after this read can still land
      // after a newer one and delete a token issued since, which the app's renewal recovers.
      installation = await this.findInstallation(id);
    } catch (err) {
      this.logging.error(err);
      return;
    }
    await this.reconcileClient(id, installation);
  }

  /** Brings the client in step with an installation just read, undefined if uninstalled. */
  private async reconcileClient(id: string, installation: Installation | undefined) {
    try {
      await this.appTokens.reconcileClient({
        id,
        active: installation?.status === 'active',
        scopes: installation?.manifest.scopes ?? [],
      });
    } catch (err) {
      this.logging.error(err);
    }
  }
}
