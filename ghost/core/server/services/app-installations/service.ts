import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { RequestContext } from '../../lib/actor';
import type { ChangeEvents } from '../../lib/change-events';
import { AppInstallationsRepository, type WriteOutcome } from './app-installations-repository';
import type { AppInstallationHistoryEntry, Installation, InstallationWithHistory } from './codec';
import type { AppInstallationEvent } from './events';
import {
  changesFrom,
  decideOnManifest,
  type AppManifestChange,
  type ManifestDecision,
} from './decide-on-manifest';
import { approvalManifestIds, buildHistory } from './history';
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
 * The app's manifest URL doesn't serve a usable manifest for this app. Nothing is written,
 * so the app opens again once the URL serves one.
 */
function unavailable(why: string) {
  return new errors.ConflictError({
    message: 'This app is unavailable.',
    context: why,
    code: 'APP_UNAVAILABLE',
  });
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
  /** Lets other services react to the changes this service makes. */
  readonly events: Pick<ChangeEvents<AppInstallationEvent>, 'react'>;
  private readonly raise: ChangeEvents<AppInstallationEvent>['raise'];
  private loadManifest: LoadManifest;
  /** Re-checks in progress, by installation ID. Sessions that start together share one. */
  private rechecking = new Map<string, Promise<void>>();

  constructor({
    knex,
    events,
    loadManifest,
  }: {
    knex: Knex;
    events: ChangeEvents<AppInstallationEvent>;
    loadManifest: LoadManifest;
  }) {
    this.repository = new AppInstallationsRepository(knex);
    this.events = events;
    this.raise = events.raise;
    this.loadManifest = loadManifest;
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

  /** Fetches and checks an app's manifest, for the publisher to review. Stores nothing. */
  async preview(manifestUrl: string): Promise<AppInstallationPreview> {
    return this.previewOf(await this.loadManifest(manifestUrl));
  }

  /** Installs an app after the publisher has reviewed its manifest, as previewed. */
  async create(
    context: RequestContext,
    { manifestUrl, digest }: { manifestUrl: string; digest: string },
  ): Promise<Installation> {
    const loaded = await this.fetchReviewed(manifestUrl, digest);
    const installation = await this.repository.insert(loaded);
    await this.raise(context.actor, { type: 'AppInstalled', change: 'added', next: installation });
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
    const loaded = await this.fetchReviewed(manifestUrl, digest);
    if (loaded.manifest.id !== current.app_id) {
      throw forAnotherApp(loaded.manifest.id);
    }
    if (current.revision !== revision) {
      // The review is out of date, which asks for a new one, unless the app has been
      // uninstalled during the fetch and there's nothing left to review.
      throw (await this.currentInstallation(id))
        ? await this.changedSinceReview(loaded)
        : uninstalled();
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
      throw await this.changedSinceReview(loaded);
    }
    const approved = stored.value;
    const updated = await this.read(id);
    if (approved) {
      await this.raise(context.actor, {
        type: 'AppChangesApproved',
        change: 'edited',
        previous: current,
        next: updated,
        fromManifestId: approved.from,
        toManifestId: approved.to,
      });
    }
    return updated;
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

    await this.raise(context.actor, {
      type: 'AppUninstalled',
      change: 'deleted',
      previous: installation,
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

  private async previewOf(loaded: LoadedManifest): Promise<AppInstallationPreview> {
    const current = await this.repository.currentInstallationOf(loaded.manifest.id);
    return {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.digest,
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
   * Fetches the manifest again and checks its digest matches the one the publisher
   * reviewed. If it doesn't, the error carries a new preview so they can review the new
   * version.
   */
  private async fetchReviewed(manifestUrl: string, digest: string): Promise<LoadedManifest> {
    const loaded = await this.loadManifest(manifestUrl);
    if (loaded.digest !== digest) {
      throw new errors.ConflictError({
        message: 'The app changed while it was being reviewed.',
        code: 'APP_MANIFEST_CHANGED',
        errorDetails: await this.previewOf(loaded),
      });
    }
    return loaded;
  }

  /** The installation changed since the review, so the error carries a new preview. */
  private async changedSinceReview(loaded: LoadedManifest) {
    return new errors.ConflictError({
      message: 'The installation changed while the app was being reviewed.',
      code: 'APP_INSTALLATION_CHANGED',
      errorDetails: await this.previewOf(loaded),
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
   * manifest, which suspends the app. No person made these changes, so they raise no change
   * events; the manifest rows record them.
   *
   * If the manifest can't be loaded, or it's for a different app, the app is broken or its
   * URL now serves someone else. The session then fails as unavailable instead of running
   * the approved manifest.
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
    } catch (err) {
      // A ValidationError means the app served something that can't be used. Anything else
      // is a fault in Ghost, which fails the session as it is.
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }
      return this.unavailableUnlessChanged(
        before,
        `${err.code}: ${err.message}${err.context ? ` (${err.context})` : ''}`,
      );
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
   * Fails the session as unavailable, saying `why` in the error's context, which the request
   * log records. If the installation changed while the manifest was loading, it may no
   * longer use that URL, so the session returns the installation as it is instead.
   */
  private async unavailableUnlessChanged(before: Installation, why: string): Promise<void> {
    const current = await this.currentInstallation(before.id);
    if (!current) {
      throw notInstalled();
    }
    if (current.revision !== before.revision) {
      return;
    }
    throw unavailable(why);
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
