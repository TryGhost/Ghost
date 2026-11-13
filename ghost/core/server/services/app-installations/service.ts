import type { AppFailureCode } from '@tryghost/app-contracts';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { ActionRow, ResourceActionLog } from '../../lib/action-log/action-log';
import type { RequestContext } from '../../lib/actor';
import {
  alreadyInstalled,
  AppInstallationsRepository,
  retryOnDeadlock,
  type AddedRow,
  type WriteOutcome,
} from './app-installations-repository';
import type { AppInstallationHistoryEntry, Installation, InstallationWithHistory } from './codec';
import { ensureTransaction, transactionOf } from '../../lib/ensure-transaction';
import {
  approvalWrite,
  changesFrom,
  recheckWrite,
  type AppManifestChange,
  type ManifestWrite,
} from './decide-on-manifest';
import type { FetchIcon } from './fetch-icon';
import type { AppInstallationActionName, appInstallationActions } from './actions';
import { approvalManifestIds, buildHistory } from './history';
import type { IdentityChecker, PinnedIdentity, StartedChallenge } from './identity-check';
import type { LoadedManifest, LoadManifest } from './load-manifest';
import type { AppInstallationStatus } from './schema';

export type { AppInstallationHistoryEntry } from './codec';
export type { AppManifestChange } from './decide-on-manifest';

/** What a publisher reviews before installing an app, or before approving changes to one. */
export interface AppInstallationPreview {
  manifest_url: string;
  manifest: AppManifest;
  /**
   * Sent back on confirm. It covers the manifest and its URL, so the install only goes
   * ahead if neither changed since the review.
   */
  digest: string;
  icon_data_url: string | null;
  /**
   * The app's origin, if the site's configuration trusts it so it skipped the challenge.
   * Empty when it answered the challenge.
   */
  trusted_origins: string[];
  /**
   * The site's existing installation of this app, if any, with its approved manifest and
   * the changes the reviewed manifest would make.
   */
  installation: {
    id: string;
    status: AppInstallationStatus;
    /**
     * Sent back on approve. Every change to the installation increments it, so an approval
     * fails if the installation changed after the review.
     */
    revision: number;
    manifest_url: string;
    manifest: AppManifest;
    icon_data_url: string | null;
    changes: AppManifestChange[];
  } | null;
}

/**
 * The session is pinned to `installation.revision` as it was when the session started.
 * Every change to the installation increments the revision, so the session ends once it
 * changes.
 */
export interface AppSession {
  installation: Installation;
}

function notFound() {
  return new errors.NotFoundError({ message: 'App installation not found.' });
}

/** The installation doesn't exist or has been uninstalled. */
function notInstalled() {
  return new errors.NotFoundError({
    message: 'This app is not installed.',
    code: 'APP_NOT_INSTALLED' satisfies AppFailureCode,
  });
}

/** The installation has been uninstalled, so there's nothing to approve. */
function uninstalled() {
  return new errors.ConflictError({
    message: 'This app has been uninstalled.',
    code: 'APP_INSTALLATION_UNINSTALLED' satisfies AppFailureCode,
  });
}

/**
 * The app's manifest URL doesn't serve a usable manifest for this app, or one that passes
 * the identity check. The session fails with the failure's own code, which Admin reads to
 * tell an app that's down or broken from one Ghost couldn't confirm. Nothing is written, so
 * the app opens again once the URL serves one.
 */
function unavailable(err: InstanceType<typeof errors.ValidationError>) {
  return new errors.ConflictError({
    message: err.message,
    context: err.context,
    code: err.code ?? 'APP_UNAVAILABLE',
  });
}

/** A loaded manifest that has passed the identity check. */
interface CheckedManifest {
  loaded: LoadedManifest;
  trustedOrigins: string[];
  /** The installation it was checked against, which the preview shows, if there is one. */
  installation: Installation | null;
}

/** The reviewed manifest is for a different app than the installed one. */
function forAnotherApp(appId: string) {
  return new errors.ValidationError({
    message: `The reviewed manifest is for ${appId}, not the app that is installed.`,
    code: 'APP_MANIFEST_OTHER_APP' satisfies AppFailureCode,
  });
}

/** The icon the installation shows once `write` is stored. */
function iconCopyKeptBy(
  write: ManifestWrite<AddedRow>,
  current: Installation,
  pending: { id: string; icon_data_url: string | null } | null,
): string | null {
  switch (write.kind) {
    case 'nothing':
      return current.icon_data_url;
    case 'approve_existing':
      return write.manifestId === pending?.id ? pending.icon_data_url : current.icon_data_url;
    case 'add_approved':
    case 'add_pending':
      return write.row.iconDataUrl;
  }
}

/**
 * Staff history is where "who installed this, and when" lives; the installation itself does
 * not hold it. The resource is the installation, and the app's name and ID ride along, so the
 * history still reads as "Podcast" long after the manifest has changed.
 */
function appAction(
  actionName: AppInstallationActionName,
  installationId: string,
  app: { id: string; name: string },
  approval?: { from_manifest_id: string; to_manifest_id: string },
): ActionRow<typeof appInstallationActions> {
  return {
    actionName,
    resourceId: installationId,
    primaryName: app.name,
    context: { app_id: app.id, ...approval },
  };
}

export class AppInstallationsService {
  private knex: Knex;
  private repository: AppInstallationsRepository;
  private actionLog: ResourceActionLog<typeof appInstallationActions>;
  private loadManifest: LoadManifest;
  private identity: IdentityChecker;
  private fetchIcon: FetchIcon;
  /** Re-checks in progress, by installation ID. Sessions that start together share one. */
  private rechecking = new Map<string, Promise<void>>();

  constructor({
    knex,
    actionLog,
    loadManifest,
    identity,
    fetchIcon,
  }: {
    knex: Knex;
    actionLog: ResourceActionLog<typeof appInstallationActions>;
    loadManifest: LoadManifest;
    identity: IdentityChecker;
    fetchIcon: FetchIcon;
  }) {
    this.knex = knex;
    this.repository = new AppInstallationsRepository(knex);
    this.actionLog = actionLog;
    this.loadManifest = loadManifest;
    this.identity = identity;
    this.fetchIcon = fetchIcon;
  }

  /** Lists installed apps, suspended ones included. Uninstalled apps aren't listed. */
  async browse(): Promise<Installation[]> {
    return this.repository.list();
  }

  /**
   * Unlike `browse`, this also returns uninstalled apps.
   * That way their details page still works.
   */
  async read(
    id: string,
    { withHistory = false, executor = this.knex }: { withHistory?: boolean; executor?: Knex } = {},
  ): Promise<InstallationWithHistory> {
    const installation: InstallationWithHistory | undefined = await this.repository.find(
      id,
      executor,
    );
    if (!installation) {
      throw notFound();
    }
    if (withHistory) {
      installation.history = await this.historyOf(id);
    }
    return installation;
  }

  /**
   * Fetches and checks an app's manifest, and runs the identity check, for the publisher to
   * review. Stores nothing.
   */
  async preview(manifestUrl: string): Promise<AppInstallationPreview> {
    const { loaded, started } = await this.load(manifestUrl);
    return this.previewOf(await this.review(loaded, started));
  }

  /**
   * Installs an app after the publisher has reviewed its manifest, as previewed. Given a
   * transaction as `executor` it joins that transaction; given a plain connection it opens its
   * own.
   */
  async create(
    context: RequestContext,
    { manifestUrl, digest }: { manifestUrl: string; digest: string },
    executor: Knex = this.knex,
  ): Promise<Installation> {
    const { loaded } = await this.fetchReviewed(manifestUrl, digest);
    const iconDataUrl = await this.fetchIcon(loaded.manifest.icon).catch(async (error: unknown) => {
      // An installed app can't be installed, whatever went wrong with its icon. The insert
      // reports the same when the app is installed after the fetch.
      throw (await this.repository.isInstalled(loaded.manifest.id))
        ? alreadyInstalled(loaded.manifest.id)
        : error;
    });
    const install = () =>
      ensureTransaction(executor, async (transacting) => {
        const installation = await this.repository.insert(loaded, iconDataUrl, { transacting });
        await this.actionLog.record(
          transacting,
          context,
          appAction('installed', installation.id, loaded.manifest),
        );
        return installation;
      });
    // A deadlock rolls back the whole transaction, so only one this command opened can be run
    // again. A caller's transaction is the caller's to retry.
    return transactionOf(executor) ? install() : retryOnDeadlock(install);
  }

  /**
   * Approves a reviewed manifest for an existing installation: pending changes, or the
   * same app at a new manifest URL. The installation keeps its ID and history.
   *
   * `revision` is the installation's revision when the review was shown. If the
   * installation changed since, the approval fails with a new preview, so the publisher
   * reviews again.
   *
   * Approving the manifest that's already approved, with nothing pending, writes and
   * records nothing.
   *
   * Given a transaction as `executor` it joins that transaction; given a plain connection it
   * opens its own.
   */
  async approve(
    context: RequestContext,
    id: string,
    { manifestUrl, digest, revision }: { manifestUrl: string; digest: string; revision: number },
    executor: Knex = this.knex,
  ): Promise<Installation> {
    const current = await this.repository.find(id, executor);
    if (!current) {
      throw notFound();
    }
    // Skip the fetches for an uninstalled app. Anything that changes during them is caught
    // by the revision check when storing.
    if (current.status === 'uninstalled') {
      throw uninstalled();
    }
    const checked = await this.fetchReviewed(manifestUrl, digest, current);
    const { loaded } = checked;
    if (current.revision !== revision) {
      throw await this.changedSinceReview(checked, id);
    }

    const write = await this.withIconCopy(
      approvalWrite({ current, pending: await this.pendingManifestOf(current), loaded }),
    ).catch((iconError: unknown) => ({ iconError }));
    const stored = await ensureTransaction(executor, async (transacting) => {
      const outcome = await this.store(current, write, { transacting });
      if (outcome.status === 'written' && outcome.value) {
        await this.actionLog.record(
          transacting,
          context,
          appAction('changes_approved', id, loaded.manifest, {
            from_manifest_id: current.manifest_id,
            to_manifest_id: outcome.value,
          }),
        );
      }
      return outcome;
    });
    if (stored.status === 'uninstalled') {
      throw uninstalled();
    }
    if (stored.status === 'changed') {
      throw await this.changedSinceReview(checked, id);
    }
    return this.read(id, { executor });
  }

  /**
   * Starts an app session when Admin opens an app page. Re-checks the manifest, then
   * returns the installation, which Admin decides what to show from. Nothing about the
   * session is stored.
   */
  async startSession(id: string): Promise<AppSession> {
    await this.recheck(id);
    const installation = await this.read(id);
    // Uninstalled after the re-check, or during a re-check this session shared.
    if (installation.status === 'uninstalled') {
      throw notInstalled();
    }
    return { installation };
  }

  /**
   * Uninstalls an app. The row is kept as a record of what was installed.
   *
   * Uninstalling an app that's already uninstalled does nothing, so a repeated request
   * doesn't add a second entry to the history.
   *
   * Given a transaction as `executor` it joins that transaction; given a plain connection it
   * opens its own.
   */
  async uninstall(context: RequestContext, id: string, executor: Knex = this.knex): Promise<void> {
    return ensureTransaction(executor, async (transacting) => {
      const installation = await this.read(id, { executor: transacting });

      const ended = await this.repository.uninstall(id, { transacting });
      if (!ended) {
        return;
      }

      await this.actionLog.record(
        transacting,
        context,
        appAction('uninstalled', id, { id: installation.app_id, name: installation.manifest.name }),
      );
    });
  }

  private async historyOf(id: string): Promise<AppInstallationHistoryEntry[]> {
    const { manifests, actions } = await this.repository.historyRows(id);
    return buildHistory(
      manifests,
      actions,
      await this.repository.loadManifestContents(approvalManifestIds(actions)),
    );
  }

  /**
   * What the site holds manifests signed with an identity key to: that key, and the backend
   * keys replaced on any installation of the app signed with it.
   */
  private async pinnedIdentityOf(
    appId: string,
    identityKeyThumbprint: string,
  ): Promise<PinnedIdentity> {
    return {
      identityKeyThumbprint,
      retiredBackendKeys: await this.repository.retiredBackendKeysOf(appId, identityKeyThumbprint),
    };
  }

  /**
   * Loads a manifest with its origin's challenge already on the way, so the two requests
   * run together rather than one after the other.
   */
  private async load(
    manifestUrl: string,
  ): Promise<{ loaded: LoadedManifest; started: StartedChallenge }> {
    const started = this.identity.challenge(manifestUrl);
    return { loaded: await this.loadManifest(manifestUrl), started };
  }

  /**
   * Runs the identity check on a manifest a publisher is to review, against `installation`,
   * or else the site's installation of that app, if it has one. Without one, a manifest
   * signed with the same key as an ended installation still can't name a backend key it
   * replaced, so uninstalling and installing again can't bring a retired key back.
   */
  private async review(
    loaded: LoadedManifest,
    started: StartedChallenge,
    installation?: Installation,
  ): Promise<CheckedManifest> {
    const current =
      installation ?? (await this.repository.currentInstallationOf(loaded.manifest.id)) ?? null;
    const pinned = await this.pinnedIdentityOf(
      loaded.manifest.id,
      current?.identity_key_thumbprint ?? loaded.identityKeyThumbprint,
    );
    const { trustedOrigins } = await this.identity.check(loaded, pinned, started);
    return { loaded, trustedOrigins, installation: current };
  }

  /**
   * Shows the icon approving would store. A reused row shows its stored copy without a
   * fetch, so the review works even if the icon URL stopped loading. The digest doesn't
   * cover the icon, so confirming fetches it again.
   */
  private async previewOf({
    loaded,
    trustedOrigins,
    installation: current,
  }: CheckedManifest): Promise<AppInstallationPreview> {
    const reviewed = {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.digest,
      trusted_origins: trustedOrigins,
    };
    if (!current) {
      return {
        ...reviewed,
        icon_data_url: await this.fetchIcon(loaded.manifest.icon),
        installation: null,
      };
    }

    const pending = await this.pendingManifestOf(current);
    const write = await this.withIconCopy(approvalWrite({ current, pending, loaded }));
    return {
      ...reviewed,
      icon_data_url: iconCopyKeptBy(write, current, pending),
      // The approved manifest shown is the one the changes were computed from, so the
      // review matches the list of changes.
      installation: {
        id: current.id,
        status: current.status,
        revision: current.revision,
        manifest_url: current.manifest_url,
        manifest: current.manifest,
        icon_data_url: current.icon_data_url,
        changes: changesFrom(current, loaded),
      },
    };
  }

  /**
   * Fetches the icon for a write that adds a row, before the transaction opens so it never
   * waits on the app. Other writes skip the fetch, so a stored copy never changes.
   */
  private async withIconCopy(write: ManifestWrite): Promise<ManifestWrite<AddedRow>> {
    switch (write.kind) {
      case 'nothing':
      case 'approve_existing':
        return write;
      case 'add_approved':
      case 'add_pending': {
        const iconDataUrl = await this.fetchIcon(write.row.loaded.manifest.icon);
        return { kind: write.kind, row: { ...write.row, iconDataUrl } };
      }
    }
  }

  /**
   * Fetches the manifest again, runs the identity check again, and checks its digest
   * matches the one the publisher reviewed. For an existing installation, the manifest must
   * be for its app, and is checked against its pinned keys. If the digest doesn't match,
   * the error carries a new preview so they can review the new version.
   */
  private async fetchReviewed(
    manifestUrl: string,
    digest: string,
    installation?: Installation,
  ): Promise<CheckedManifest> {
    const { loaded, started } = await this.load(manifestUrl);
    if (installation && loaded.manifest.id !== installation.app_id) {
      throw forAnotherApp(loaded.manifest.id);
    }
    const checked = await this.review(loaded, started, installation);
    if (loaded.digest !== digest) {
      throw new errors.ConflictError({
        message: 'The app changed while it was being reviewed.',
        code: 'APP_MANIFEST_CHANGED' satisfies AppFailureCode,
        errorDetails: await this.previewOf(checked),
      });
    }
    return checked;
  }

  /**
   * The installation changed since the review, so the error carries a new preview of it as
   * it is now, unless it has been uninstalled and there's nothing left to review.
   */
  private async changedSinceReview(checked: CheckedManifest, id: string) {
    const installation = await this.currentInstallation(id);
    if (!installation) {
      return uninstalled();
    }
    return new errors.ConflictError({
      message: 'The installation changed while the app was being reviewed.',
      code: 'APP_INSTALLATION_CHANGED' satisfies AppFailureCode,
      errorDetails: await this.previewOf({ ...checked, installation }),
    });
  }

  /** The pending manifest's ID, digest and icon copy, or null if nothing is pending. */
  private async pendingManifestOf(installation: Installation) {
    const id = installation.pending_manifest_id;
    if (id === null) {
      return null;
    }
    const pending = await this.repository.findDigestAndIcon(id);
    return pending ? { id, ...pending } : null;
  }

  /**
   * Applies a write planned from `current`, unless the installation changed since. Returns
   * the newly approved or pending manifest's ID, or null for `nothing`. Throws the error of an
   * icon fetch that failed, but only once the installation is known to be unchanged.
   */
  private store(
    current: Installation,
    write: ManifestWrite<AddedRow> | { iconError: unknown },
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<WriteOutcome<string | null>> {
    return this.repository.whileUnchanged(
      current,
      async (locked) => {
        // Thrown under the lock, so an uninstall or change during the icon fetch wins.
        if ('iconError' in write) {
          throw write.iconError;
        }
        switch (write.kind) {
          case 'nothing':
            return null;
          case 'approve_existing':
            await locked.activate(write.manifestId);
            return write.manifestId;
          case 'add_approved': {
            const added = await locked.addManifest(write.row);
            await locked.activate(added);
            return added;
          }
          case 'add_pending': {
            const added = await locked.addManifest(write.row);
            await locked.suspend(added);
            return added;
          }
          default: {
            const _exhaustive: never = write;
            throw new errors.InternalServerError({
              message: `Unhandled manifest write: ${JSON.stringify(_exhaustive)}`,
            });
          }
        }
      },
      { transacting },
    );
  }

  private recheck(id: string): Promise<void> {
    const inFlight = this.rechecking.get(id);
    if (inFlight) {
      return inFlight;
    }
    const run = this.recheckOnce(id).finally(() => this.rechecking.delete(id));
    this.rechecking.set(id, run);
    return run;
  }

  /**
   * Fetches the app's manifest again from its approved manifest URL and stores what
   * changed. Silent changes are applied. Changes that need approval become the pending
   * manifest, which suspends the app. No person made these changes, so nothing goes into
   * the staff history; the manifest rows record them.
   *
   * If the manifest can't be loaded, fails the identity check, or is for a different app,
   * the app is broken or its URL now serves someone else. The session then fails instead of
   * running the approved manifest, with the failure's own code. So does an icon that can't
   * be loaded when a new row needs storing, even for a silent change; a re-check that stores
   * nothing doesn't fetch it. The challenge goes out with the manifest fetch, so a session
   * start waits for one round trip to the app, not two.
   *
   * Everything is looked up by installation ID, never app ID, so a re-check that started
   * before an uninstall can't bring that installation back or change a newer installation
   * of the same app. If the installation changed while the manifest was loading, the
   * re-check does nothing, because the loaded manifest may be older than that change.
   */
  private async recheckOnce(id: string): Promise<void> {
    const before = await this.currentInstallation(id);
    if (!before) {
      throw notInstalled();
    }

    let write: ManifestWrite<AddedRow>;
    try {
      // The retired keys are read while the manifest loads.
      const [fetched, pinned] = await Promise.all([
        this.load(before.manifest_url),
        this.pinnedIdentityOf(before.app_id, before.identity_key_thumbprint),
      ]);
      const { loaded } = fetched;
      if (loaded.manifest.id !== before.app_id) {
        throw new errors.ValidationError({
          message: `${before.manifest_url} now serves ${loaded.manifest.id}.`,
          code: 'APP_MANIFEST_OTHER_APP' satisfies AppFailureCode,
        });
      }
      await this.identity.check(loaded, pinned, fetched.started);
      write = await this.withIconCopy(
        recheckWrite({ current: before, pending: await this.pendingManifestOf(before), loaded }),
      );
    } catch (err) {
      // A ValidationError means the app served something that can't be used. Anything else
      // is a fault in Ghost, which fails the session as it is.
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }
      return this.unavailableUnlessChanged(before, err);
    }

    const stored = await this.knex.transaction((transacting) =>
      this.store(before, write, { transacting }),
    );
    if (stored.status === 'uninstalled') {
      throw notInstalled();
    }
  }

  /** The installation, unless it doesn't exist or has been uninstalled. */
  private async currentInstallation(id: string): Promise<Installation | undefined> {
    const installation = await this.repository.find(id);
    return installation?.status === 'uninstalled' ? undefined : installation;
  }

  /**
   * Fails the session with why the manifest couldn't be used in the error's context, which
   * the request log records. If the installation changed while the manifest was loading, it
   * may no longer use that URL, so the session returns the installation as it is instead.
   */
  private async unavailableUnlessChanged(
    before: Installation,
    err: InstanceType<typeof errors.ValidationError>,
  ): Promise<void> {
    const current = await this.currentInstallation(before.id);
    if (!current) {
      throw notInstalled();
    }
    if (current.revision !== before.revision) {
      return;
    }
    throw unavailable(err);
  }
}
