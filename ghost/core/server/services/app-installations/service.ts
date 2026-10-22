import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import { AppInstallationsRepository, type WriteOutcome } from './app-installations-repository';
import type { AppInstallationHistoryEntry, Installation, InstallationWithHistory } from './codec';
import {
  changesFrom,
  decideOnManifest,
  type AppManifestChange,
  type ManifestDecision,
} from './decide-on-manifest';
import { approvalManifestIds, buildHistory } from './history';
import { IDENTITY_FAILURE_CODES, type CheckIdentity, type PinnedIdentity } from './identity-check';
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
  /**
   * The origins the manifest names, its own included, that the site's configuration
   * trusts, so they skipped the challenge. Empty when every origin answered it.
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
    code: 'APP_NOT_INSTALLED',
  });
}

/** The installation has been uninstalled, so there's nothing to approve. */
function uninstalled() {
  return new errors.ConflictError({
    message: 'This app has been uninstalled.',
    code: 'APP_INSTALLATION_UNINSTALLED',
  });
}

/**
 * The app's manifest URL doesn't serve a usable manifest for this app, or one that passes
 * the identity check, which keeps its own code. Nothing is written, so the app opens again
 * once the URL serves one.
 */
function unavailable(err: InstanceType<typeof errors.ValidationError>) {
  if (err.code && IDENTITY_FAILURE_CODES.has(err.code)) {
    return new errors.ConflictError({
      message: err.message,
      context: err.context,
      code: err.code,
    });
  }
  return new errors.ConflictError({
    message: 'This app is unavailable.',
    context: `${err.code}: ${err.message}${err.context ? ` (${err.context})` : ''}`,
    code: 'APP_UNAVAILABLE',
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
    code: 'APP_MANIFEST_OTHER_APP',
  });
}

export class AppInstallationsService {
  private repository: AppInstallationsRepository;
  private recordAction: RecordAppInstallationAction;
  private loadManifest: LoadManifest;
  private checkIdentity: CheckIdentity;
  /** Re-checks in progress, by installation ID. Sessions that start together share one. */
  private rechecking = new Map<string, Promise<void>>();

  constructor({
    knex,
    recordAction,
    loadManifest,
    checkIdentity,
  }: {
    knex: Knex;
    recordAction: RecordAppInstallationAction;
    loadManifest: LoadManifest;
    checkIdentity: CheckIdentity;
  }) {
    this.repository = new AppInstallationsRepository(knex);
    this.recordAction = recordAction;
    this.loadManifest = loadManifest;
    this.checkIdentity = checkIdentity;
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
    { withHistory = false }: { withHistory?: boolean } = {},
  ): Promise<InstallationWithHistory> {
    const installation: InstallationWithHistory | undefined = await this.repository.find(id);
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
    return this.previewOf(await this.review(await this.loadManifest(manifestUrl)));
  }

  /** Installs an app after the publisher has reviewed its manifest, as previewed. */
  async create(
    context: RequestContext,
    { manifestUrl, digest }: { manifestUrl: string; digest: string },
  ): Promise<Installation> {
    const { loaded } = await this.fetchReviewed(manifestUrl, digest);
    const installation = await this.repository.insert(loaded);
    await this.recordAction({
      context,
      event: 'installed',
      subject: installation.id,
      details: { primary_name: loaded.manifest.name, app_id: loaded.manifest.id },
    });
    return installation;
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
   */
  async approve(
    context: RequestContext,
    id: string,
    { manifestUrl, digest, revision }: { manifestUrl: string; digest: string; revision: number },
  ): Promise<Installation> {
    const current = await this.repository.find(id);
    if (!current) {
      throw notFound();
    }
    // No need to fetch for an uninstalled installation. The approval is only written
    // while the installation is as it was read here, which covers an uninstall or a change
    // that happens during the fetch.
    if (current.status === 'uninstalled') {
      throw uninstalled();
    }
    const checked = await this.fetchReviewed(manifestUrl, digest, current);
    const { loaded } = checked;
    if (current.revision !== revision) {
      throw await this.changedSinceReview(checked, id);
    }

    const decision = decideOnManifest({
      current,
      pending: await this.pendingManifestOf(current),
      loaded,
    });
    const stored = await this.storeApproval(current, loaded, decision);
    if (stored.status === 'uninstalled') {
      throw uninstalled();
    }
    if (stored.status === 'changed') {
      throw await this.changedSinceReview(checked, id);
    }
    const approved = stored.value;
    if (approved) {
      await this.recordAction({
        context,
        event: 'changes_approved',
        subject: id,
        details: {
          primary_name: loaded.manifest.name,
          app_id: loaded.manifest.id,
          from_manifest_id: approved.from,
          to_manifest_id: approved.to,
        },
      });
    }
    return this.read(id);
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
   */
  async uninstall(context: RequestContext, id: string): Promise<void> {
    const installation = await this.read(id);

    const ended = await this.repository.uninstall(id);
    if (!ended) {
      return;
    }

    await this.recordAction({
      context,
      event: 'uninstalled',
      subject: id,
      details: { primary_name: installation.manifest.name, app_id: installation.app_id },
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

  /** The pinned identity key and retired backend keys of an installation. */
  private async pinnedIdentityOf(installation: Installation): Promise<PinnedIdentity> {
    return {
      identityKeyThumbprint: installation.identity_key_thumbprint,
      retiredBackendKeys: await this.repository.retiredBackendKeysOf(installation.id),
    };
  }

  /**
   * Runs the identity check on a manifest a publisher is to review, against `installation`,
   * or else the site's installation of that app, if it has one.
   */
  private async review(
    loaded: LoadedManifest,
    installation?: Installation,
  ): Promise<CheckedManifest> {
    const current =
      installation ?? (await this.repository.currentInstallationOf(loaded.manifest.id)) ?? null;
    const pinned = current ? await this.pinnedIdentityOf(current) : null;
    const { trustedOrigins } = await this.checkIdentity(loaded, pinned);
    return { loaded, trustedOrigins, installation: current };
  }

  private previewOf({
    loaded,
    trustedOrigins,
    installation: current,
  }: CheckedManifest): AppInstallationPreview {
    return {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.digest,
      trusted_origins: trustedOrigins,
      // The approved manifest shown is the one the changes were computed from, so the
      // review matches the list of changes.
      installation: current
        ? {
            id: current.id,
            status: current.status,
            revision: current.revision,
            manifest_url: current.manifest_url,
            manifest: current.manifest,
            changes: changesFrom(current, loaded),
          }
        : null,
    };
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
    const loaded = await this.loadManifest(manifestUrl);
    if (installation && loaded.manifest.id !== installation.app_id) {
      throw forAnotherApp(loaded.manifest.id);
    }
    const checked = await this.review(loaded, installation);
    if (loaded.digest !== digest) {
      throw new errors.ConflictError({
        message: 'The app changed while it was being reviewed.',
        code: 'APP_MANIFEST_CHANGED',
        errorDetails: this.previewOf(checked),
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
      code: 'APP_INSTALLATION_CHANGED',
      errorDetails: this.previewOf({ ...checked, installation }),
    });
  }

  /** The installation's pending manifest, by its digest, if it has one. */
  private async pendingManifestOf(installation: Installation) {
    if (installation.pending_manifest_id === null) {
      return null;
    }
    const digest = await this.repository.findDigest(installation.pending_manifest_id);
    return digest === undefined ? null : { digest };
  }

  /**
   * Stores a publisher's approval of the reviewed manifest, which becomes the approved
   * manifest whatever changed. It's only written while the installation is as `current`,
   * which the approval was decided from.
   *
   * The pending manifest and the approved one already have rows, so approving either adds
   * none; approving the approved manifest lets go of the pending one. Any other manifest gets
   * an `approval` row.
   *
   * Returns the approved manifest ID before and after, or null when it's the approved manifest
   * with nothing pending, which writes nothing.
   */
  private storeApproval(
    current: Installation,
    loaded: LoadedManifest,
    { kind, changes }: ManifestDecision,
  ): Promise<WriteOutcome<{ from: string; to: string } | null>> {
    return this.repository.whileUnchanged(current, async (locked) => {
      if (kind === 'unchanged') {
        return null;
      }
      let approved: string;
      if (kind === 'use_pending' && current.pending_manifest_id !== null) {
        approved = current.pending_manifest_id;
      } else if (changes.length === 0) {
        approved = current.manifest_id;
      } else {
        approved = await locked.addManifest(loaded, {
          source: 'approval',
          requiresApproval: changes.some((change) => change.requires_approval),
        });
      }
      await locked.activate(approved);
      return { from: current.manifest_id, to: approved };
    });
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
   * running the approved manifest: with the identity check's code when it failed, and as
   * unavailable otherwise.
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

    let loaded: LoadedManifest;
    try {
      loaded = await this.loadManifest(before.manifest_url);
      if (loaded.manifest.id !== before.app_id) {
        throw new errors.ValidationError({
          message: `${before.manifest_url} now serves ${loaded.manifest.id}.`,
          code: 'APP_MANIFEST_OTHER_APP',
        });
      }
      await this.checkIdentity(loaded, await this.pinnedIdentityOf(before));
    } catch (err) {
      // A ValidationError means the app served something that can't be used. Anything else
      // is a fault in Ghost, which fails the session as it is.
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }
      return this.unavailableUnlessChanged(before, err);
    }

    const decision = decideOnManifest({
      current: before,
      pending: await this.pendingManifestOf(before),
      loaded,
    });
    const stored = await this.storeRecheck(before, loaded, decision);
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

  /**
   * Stores what a re-check found. It's only written while the installation is as `current`,
   * which the re-check decided from. No person made these changes, so each gets a manifest
   * row as its only record.
   */
  private storeRecheck(
    current: Installation,
    loaded: LoadedManifest,
    { kind }: ManifestDecision,
  ): Promise<WriteOutcome<void>> {
    return this.repository.whileUnchanged(current, async (locked) => {
      switch (kind) {
        case 'unchanged':
        case 'use_pending':
          return;
        // Silent changes are applied straight away. When the app reverted the pending changes,
        // that lifts the suspension.
        case 'apply':
        case 'resume': {
          const applied = await locked.addManifest(loaded, {
            source: kind === 'resume' ? 'resume' : 'update',
            requiresApproval: false,
          });
          return locked.activate(applied);
        }
        case 'suspend': {
          // Any other change becomes the pending manifest, replacing an older one.
          const pending = await locked.addManifest(loaded, {
            source: 'update',
            requiresApproval: true,
          });
          return locked.suspend(pending);
        }
        default: {
          const _exhaustive: never = kind;
          throw new errors.InternalServerError({
            message: `Unhandled manifest decision: ${_exhaustive}`,
          });
        }
      }
    });
  }
}
