import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import { AppInstallationsRepository } from './app-installations-repository';
import type { AppInstallation, Installation } from './codec';
import {
  changesFrom,
  decideOnManifest,
  type AppManifestChange,
  type ManifestDecision,
} from './decide-on-manifest';
import { approvalManifestIds, buildHistory } from './history';
import type { LoadedManifest, LoadManifest } from './load-manifest';
import type { AppInstallationStatus } from './schema';

export type { AppInstallation, AppInstallationHistoryEntry } from './codec';
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
  installation: AppInstallation;
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

/** The installation as the Admin API returns it. */
function toAppInstallation(installation: Installation): AppInstallation {
  return {
    id: installation.id,
    app_id: installation.app_id,
    status: installation.status,
    revision: installation.revision,
    manifest_url: installation.manifest_url,
    manifest: installation.manifest,
    created_at: installation.created_at,
    updated_at: installation.updated_at,
  };
}

/**
 * Writes a manifest decision for an installation. Approval and the re-check at session
 * start both use it, so they always store a manifest the same way.
 *
 * Call it in `repository.whileUnchanged`, with the `current` the decision was made from.
 *
 * `source` is who made the change:
 * - `update`: the re-check. It applies silent changes, and stores changes that need
 *   approval as the pending manifest, which suspends the installation.
 * - `approval`: a publisher. It applies the reviewed manifest, whatever changed.
 *
 * Each new manifest gets its own row, except the pending manifest when it's approved, which
 * already has one. When the re-check lifts a suspension because the app reverted the
 * pending changes, it writes a `resume` row: no person made that change, so the row is the
 * only record of it. Approving the manifest that's already approved writes no row; the
 * staff history records the approval.
 *
 * Returns the approved manifest ID before and after, or null if there was nothing to write.
 */
export async function keepManifest(
  repository: AppInstallationsRepository,
  trx: Knex.Transaction,
  current: Installation,
  loaded: LoadedManifest,
  { kind, changes }: ManifestDecision,
  source: 'approval' | 'update',
): Promise<{ from: string; to: string } | null> {
  if (kind === 'unchanged' || (kind === 'use_pending' && source === 'update')) {
    return null;
  }
  const waits = kind === 'suspend' && source === 'update';
  // An approval that resolves to `resume` is recorded as an approval, not a resume.
  const resumes = kind === 'resume' && source === 'update';

  let manifestId = current.manifest_id;
  if (kind === 'use_pending' && current.pending_manifest_id !== null) {
    manifestId = current.pending_manifest_id;
  } else if (changes.length > 0 || resumes) {
    manifestId = await repository.addManifest(trx, current.id, loaded, {
      source: resumes ? 'resume' : source,
      requiresApproval: kind === 'suspend',
    });
  }

  if (waits) {
    await repository.suspend(trx, current.id, manifestId);
    return { from: current.manifest_id, to: current.manifest_id };
  }
  await repository.activate(trx, current.id, manifestId);
  return { from: current.manifest_id, to: manifestId };
}

export class AppInstallationsService {
  private repository: AppInstallationsRepository;
  private recordAction: RecordAppInstallationAction;
  private loadManifest: LoadManifest;
  /** Re-checks in progress, by installation ID. Sessions that start together share one. */
  private rechecking = new Map<string, Promise<void>>();

  constructor({
    knex,
    recordAction,
    loadManifest,
  }: {
    knex: Knex;
    recordAction: RecordAppInstallationAction;
    loadManifest: LoadManifest;
  }) {
    this.repository = new AppInstallationsRepository(knex);
    this.recordAction = recordAction;
    this.loadManifest = loadManifest;
  }

  /** Lists installed apps, suspended ones included. Uninstalled apps aren't listed. */
  async browse(): Promise<AppInstallation[]> {
    return (await this.repository.list()).map(toAppInstallation);
  }

  /**
   * Unlike `browse`, this also returns uninstalled apps.
   * That way their details page still works.
   */
  async read(
    id: string,
    { withHistory = false }: { withHistory?: boolean } = {},
  ): Promise<AppInstallation> {
    const found = await this.repository.find(id);
    if (!found) {
      throw notFound();
    }
    const installation = toAppInstallation(found);
    if (withHistory) {
      installation.history = await this.historyOf(id);
    }
    return installation;
  }

  private async historyOf(id: string): Promise<AppInstallation['history']> {
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

  /** Fetches and checks an app's manifest, for the publisher to review. Stores nothing. */
  async preview(manifestUrl: string): Promise<AppInstallationPreview> {
    return this.previewOf(await this.loadManifest(manifestUrl));
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

  /** Installs an app after the publisher has reviewed its manifest, as previewed. */
  async create(
    context: RequestContext,
    { manifestUrl, digest }: { manifestUrl: string; digest: string },
  ): Promise<AppInstallation> {
    const loaded = await this.fetchReviewed(manifestUrl, digest);
    const installation = await this.repository.insert(loaded);
    await this.recordAction({
      context,
      event: 'installed',
      subject: installation.id,
      details: { primary_name: loaded.manifest.name, app_id: loaded.manifest.id },
    });
    return toAppInstallation(installation);
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
  ): Promise<AppInstallation> {
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
      throw await this.changedSinceReview(loaded);
    }

    const decision = decideOnManifest({
      current,
      pending: await this.pendingManifestOf(current),
      loaded,
    });
    const approved = await this.repository.whileUnchanged(current, (trx) =>
      keepManifest(this.repository, trx, current, loaded, decision, 'approval'),
    );
    if (approved === 'uninstalled') {
      throw uninstalled();
    }
    if (approved === 'changed') {
      throw await this.changedSinceReview(loaded);
    }
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

  /** The installation changed since the review, so the error carries a new preview. */
  private async changedSinceReview(loaded: LoadedManifest) {
    return new errors.ConflictError({
      message: 'The installation changed while the app was being reviewed.',
      code: 'APP_INSTALLATION_CHANGED',
      errorDetails: await this.previewOf(loaded),
    });
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

  /** The installation, unless it doesn't exist or has been uninstalled. */
  private async currentInstallation(id: string): Promise<Installation | undefined> {
    const installation = await this.repository.find(id);
    return installation?.status === 'uninstalled' ? undefined : installation;
  }

  /** The installation's pending manifest, if it has one. */
  private async pendingManifestOf(installation: Installation) {
    if (installation.pending_manifest_id === null) {
      return null;
    }
    return (await this.repository.findManifest(installation.pending_manifest_id)) ?? null;
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

    // Returns the error to fail the session with. Its context says what was wrong, and the
    // request log records it. Returns null if the installation changed while the manifest
    // was loading, since it may no longer use that URL; the session then returns the
    // installation as it is.
    const unavailableBecause = async (
      code: string | null,
      message: string,
      reason?: string,
    ): Promise<Error | null> => {
      const current = await this.currentInstallation(id);
      if (!current) {
        return notInstalled();
      }
      if (current.revision !== before.revision) {
        return null;
      }
      return unavailable(`${code}: ${message}${reason ? ` (${reason})` : ''}`);
    };
    let loaded: LoadedManifest;
    try {
      loaded = await this.loadManifest(before.manifest_url);
    } catch (err) {
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }
      const failure = await unavailableBecause(err.code, err.message, err.context);
      if (failure) {
        throw failure;
      }
      return;
    }
    if (loaded.manifest.id !== before.app_id) {
      const failure = await unavailableBecause(
        'APP_MANIFEST_OTHER_APP',
        `${before.manifest_url} now serves ${loaded.manifest.id}.`,
      );
      if (failure) {
        throw failure;
      }
      return;
    }

    const decision = decideOnManifest({
      current: before,
      pending: await this.pendingManifestOf(before),
      loaded,
    });
    const kept = await this.repository.whileUnchanged(before, (trx) =>
      keepManifest(this.repository, trx, before, loaded, decision, 'update'),
    );
    if (kept === 'uninstalled') {
      throw notInstalled();
    }
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
}
