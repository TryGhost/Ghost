import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import {
  AppInstallationsRepository,
  type AddedRow,
  type WriteOutcome,
} from './app-installations-repository';
import type { AppInstallationHistoryEntry, Installation, InstallationWithHistory } from './codec';
import {
  approvalWrite,
  changesFrom,
  recheckWrite,
  type AppManifestChange,
  type ManifestWrite,
} from './decide-on-manifest';
import type { FetchIcon } from './fetch-icon';
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
  icon_svg: string | null;
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
    icon_svg: string | null;
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

/**
 * The icon copy the installation has once `write` is stored: the new row's, or otherwise the
 * copy of the row that is or becomes the approved one.
 */
function iconCopyKeptBy(
  write: ManifestWrite<AddedRow>,
  current: Installation,
  pending: { id: string; icon_svg: string | null } | null,
): string | null {
  switch (write.kind) {
    case 'nothing':
      return current.icon_svg;
    case 'approve_existing':
      return write.manifestId === pending?.id ? pending.icon_svg : current.icon_svg;
    case 'add_approved':
    case 'add_pending':
      return write.row.iconSvg;
  }
}

export class AppInstallationsService {
  private repository: AppInstallationsRepository;
  private recordAction: RecordAppInstallationAction;
  private loadManifest: LoadManifest;
  private fetchIcon: FetchIcon;
  /** Re-checks in progress, by installation ID. Sessions that start together share one. */
  private rechecking = new Map<string, Promise<void>>();

  constructor({
    knex,
    recordAction,
    loadManifest,
    fetchIcon,
  }: {
    knex: Knex;
    recordAction: RecordAppInstallationAction;
    loadManifest: LoadManifest;
    fetchIcon: FetchIcon;
  }) {
    this.repository = new AppInstallationsRepository(knex);
    this.recordAction = recordAction;
    this.loadManifest = loadManifest;
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
    const installation = await this.repository.insert(
      loaded,
      await this.fetchIcon(loaded.manifest.icon),
    );
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
    // that happens during the fetches.
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

    const write = await this.withIconCopy(
      approvalWrite({ current, pending: await this.pendingManifestOf(current), loaded }),
    );
    const stored = await this.store(current, write);
    if (stored.status === 'uninstalled') {
      throw uninstalled();
    }
    if (stored.status === 'changed') {
      throw await this.changedSinceReview(loaded);
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
          from_manifest_id: current.manifest_id,
          to_manifest_id: approved,
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

  /**
   * Shows the icon copy that approving the review would keep. When that's a copy Ghost
   * already has, the pending manifest's or the approved one's, the icon isn't fetched, as
   * approving won't fetch it either. Otherwise it's fetched as the app serves it now. The
   * digest covers only the manifest, and confirming fetches the icon again, so the copy
   * stored can differ if the app replaced its SVG in between.
   */
  private async previewOf(loaded: LoadedManifest): Promise<AppInstallationPreview> {
    const reviewed = {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.digest,
    };
    const current = await this.repository.currentInstallationOf(loaded.manifest.id);
    if (!current) {
      return {
        ...reviewed,
        icon_svg: await this.fetchIcon(loaded.manifest.icon),
        installation: null,
      };
    }

    const pending = await this.pendingManifestOf(current);
    const write = await this.withIconCopy(approvalWrite({ current, pending, loaded }));
    return {
      ...reviewed,
      icon_svg: iconCopyKeptBy(write, current, pending),
      // The approved manifest shown is the one the changes were computed from, so the
      // review matches the list of changes.
      installation: {
        id: current.id,
        status: current.status,
        revision: current.revision,
        manifest_url: current.manifest_url,
        manifest: current.manifest,
        icon_svg: current.icon_svg,
        changes: changesFrom(current, loaded),
      },
    };
  }

  /**
   * Fetches the icon copy for the row a write adds, so the write's transaction never waits on
   * the app. Each new row takes a fresh copy, and a write that adds none doesn't fetch it, so
   * a stored copy never changes and a re-check that stores nothing never contacts the icon's
   * URL.
   */
  private async withIconCopy(write: ManifestWrite): Promise<ManifestWrite<AddedRow>> {
    switch (write.kind) {
      case 'nothing':
      case 'approve_existing':
        return write;
      case 'add_approved':
      case 'add_pending': {
        const iconSvg = await this.fetchIcon(write.row.loaded.manifest.icon);
        return { kind: write.kind, row: { ...write.row, iconSvg } };
      }
    }
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

  /** The installation's pending manifest, by its ID, digest and icon copy, if it has one. */
  private async pendingManifestOf(installation: Installation) {
    const id = installation.pending_manifest_id;
    if (id === null) {
      return null;
    }
    const pending = await this.repository.findDigestAndIcon(id);
    return pending ? { id, ...pending } : null;
  }

  /**
   * Carries out a write planned from `current`, unless the installation has changed since.
   * The value it returns is the ID of the new approved or pending manifest, or null for a
   * `nothing` write.
   */
  private store(
    current: Installation,
    write: ManifestWrite<AddedRow>,
  ): Promise<WriteOutcome<string | null>> {
    return this.repository.whileUnchanged(current, async (locked) => {
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
   * If the manifest can't be loaded, or it's for a different app, the app is broken or its
   * URL now serves someone else. The session then fails as unavailable instead of running
   * the approved manifest. So does an icon that can't be loaded for a manifest that would be
   * stored, silent changes and resumes included, since each stored version takes a fresh copy;
   * a re-check that stores nothing never fetches the icon.
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
      const loaded = await this.loadManifest(before.manifest_url);
      if (loaded.manifest.id !== before.app_id) {
        throw new errors.ValidationError({
          message: `${before.manifest_url} now serves ${loaded.manifest.id}.`,
          code: 'APP_MANIFEST_OTHER_APP',
        });
      }
      write = await this.withIconCopy(
        recheckWrite({ current: before, pending: await this.pendingManifestOf(before), loaded }),
      );
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

    const stored = await this.store(before, write);
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
}
