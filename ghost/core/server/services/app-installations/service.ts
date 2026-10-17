import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import type { AppInstallation, CurrentInstallation } from './codec';
import type { FetchIcon } from './fetch-icon';
import { changesFrom, transition, type AppManifestChange } from './lifecycle';
import type { LoadedManifest, LoadManifest } from './load-manifest';
import type { AppInstallationStatus } from './schema';
import { AppInstallationsStore, type Applied } from './store';

export type { AppInstallation, AppInstallationHistoryEntry } from './codec';
export type { AppManifestChange } from './lifecycle';

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
  installation: AppInstallation;
}

/** No installation has this ID. */
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

export class AppInstallationsService {
  private store: AppInstallationsStore;
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
    this.store = new AppInstallationsStore(knex);
    this.recordAction = recordAction;
    this.loadManifest = loadManifest;
    this.fetchIcon = fetchIcon;
  }

  /** Lists installed apps, suspended ones included. Uninstalled apps aren't listed. */
  browse(): Promise<AppInstallation[]> {
    return this.store.list();
  }

  /**
   * Unlike `browse`, this also returns uninstalled apps.
   * That way their details page still works.
   */
  async read(
    id: string,
    { withHistory = false }: { withHistory?: boolean } = {},
  ): Promise<AppInstallation> {
    const installation = await this.store.find(id);
    if (!installation) {
      throw notFound();
    }
    if (withHistory) {
      installation.history = await this.store.history(id);
    }
    return installation;
  }

  /**
   * Shows the icon copy that approving the review would keep. When that's a copy Ghost
   * already has, the pending manifest's or the approved one's, the icon isn't fetched, as
   * approving won't fetch it either. Otherwise it's fetched as the app serves it now. The
   * digest covers only the manifest, and confirming fetches the icon again, so the copy
   * stored can differ if the app replaced its SVG in between.
   */
  private async previewOf(incoming: LoadedManifest): Promise<AppInstallationPreview> {
    const reviewed = {
      manifest_url: incoming.manifestUrl,
      manifest: incoming.manifest,
      digest: incoming.digest,
    };
    const installation = await this.store.current({ appId: incoming.manifest.id });
    if (!installation) {
      return {
        ...reviewed,
        icon_svg: await this.fetchIcon(incoming.manifest.icon),
        installation: null,
      };
    }

    const changes = changesFrom(installation, incoming);
    const next = transition(installation, { type: 'approve', manifest: incoming });
    const approvedIcon = this.store.icon(installation.manifest_id);
    // An approval that writes nothing, or runs the approved row again, keeps the approved
    // copy.
    let keptIcon = approvedIcon;
    if ('stores' in next) {
      keptIcon = this.fetchIcon(incoming.manifest.icon);
    } else if (
      'approvedManifestId' in next &&
      next.approvedManifestId !== installation.manifest_id
    ) {
      keptIcon = this.store.icon(next.approvedManifestId);
    }
    // Read together, since fetching the icon can take a while.
    const [iconSvg, approvedIconSvg] = await Promise.all([keptIcon, approvedIcon]);
    return {
      ...reviewed,
      icon_svg: iconSvg,
      // The approved manifest shown is the one the changes were computed from, so the
      // review matches the list of changes.
      installation: {
        id: installation.id,
        status: installation.status,
        revision: installation.revision,
        manifest_url: installation.manifest_url,
        manifest: installation.manifest,
        icon_svg: approvedIconSvg,
        changes,
      },
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
    const latest = await this.loadManifest(manifestUrl);
    if (latest.digest !== digest) {
      throw new errors.ConflictError({
        message: 'The app changed while it was being reviewed.',
        code: 'APP_MANIFEST_CHANGED',
        errorDetails: await this.previewOf(latest),
      });
    }
    return latest;
  }

  /** Installs an app after the publisher has reviewed its manifest, as previewed. */
  async create(
    context: RequestContext,
    { manifestUrl, digest }: { manifestUrl: string; digest: string },
  ): Promise<AppInstallation> {
    const reviewed = await this.fetchReviewed(manifestUrl, digest);
    const { manifest } = reviewed;
    const installation = await this.store.install(reviewed, await this.fetchIcon(manifest.icon));
    await this.recordAction({
      context,
      event: 'installed',
      subject: installation.id,
      details: { primary_name: manifest.name, app_id: manifest.id },
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
  ): Promise<AppInstallation> {
    const installation = await this.store.current({ id });
    // No need to fetch for an uninstalled installation. Applying the transition at the
    // revision read here covers an uninstall or a change that happens during the fetches.
    if (!installation) {
      throw (await this.store.find(id)) ? uninstalled() : notFound();
    }
    const reviewed = await this.fetchReviewed(manifestUrl, digest);
    if (reviewed.manifest.id !== installation.app_id) {
      throw new errors.ValidationError({
        message: `The reviewed manifest is for ${reviewed.manifest.id}, not the app that is installed.`,
        code: 'APP_MANIFEST_OTHER_APP',
      });
    }
    if (installation.revision !== revision) {
      throw await this.installationChanged(reviewed);
    }

    const result = await this.applyIncoming(installation, reviewed, 'approve');
    if (result.outcome === 'gone') {
      throw uninstalled();
    }
    if (result.outcome === 'stale') {
      throw await this.installationChanged(reviewed);
    }
    if (result.outcome === 'applied') {
      await this.recordAction({
        context,
        event: 'changes_approved',
        subject: id,
        details: {
          primary_name: reviewed.manifest.name,
          app_id: reviewed.manifest.id,
          from_manifest_id: result.from,
          to_manifest_id: result.to,
        },
      });
    }
    return this.read(id);
  }

  /**
   * Applies the transition an incoming manifest makes for the installation, as it was read
   * before the manifest was fetched. Approval and the re-check at session start both use it,
   * so they always store a manifest the same way. The transition is decided, and the icon
   * fetched if it stores a new row, before the transaction that writes it, so the icon is
   * never fetched inside one.
   */
  private async applyIncoming(
    installation: CurrentInstallation,
    incoming: LoadedManifest,
    type: 'recheck' | 'approve',
  ): Promise<Applied> {
    const next = transition(installation, { type, manifest: incoming });
    if (!('stores' in next)) {
      return this.store.apply(installation, next);
    }
    // The copy is only ever taken when a manifest version is stored.
    const iconSvg = await this.fetchIcon(incoming.manifest.icon);
    return this.store.apply(installation, next, { manifest: incoming, iconSvg });
  }

  /** The installation changed since the review, so the error carries a new preview. */
  private async installationChanged(reviewed: LoadedManifest) {
    return new errors.ConflictError({
      message: 'The installation changed while the app was being reviewed.',
      code: 'APP_INSTALLATION_CHANGED',
      errorDetails: await this.previewOf(reviewed),
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
   * changed. Silent changes are adopted. Changes that need approval become the pending
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
   * re-check does nothing, because the latest manifest may be older than that change.
   */
  private async recheckOnce(id: string): Promise<void> {
    const installation = await this.store.current({ id });
    if (!installation) {
      throw notInstalled();
    }
    try {
      const latest = await this.loadManifest(installation.manifest_url);
      if (latest.manifest.id !== installation.app_id) {
        throw new errors.ValidationError({
          message: `${installation.manifest_url} now serves ${latest.manifest.id}.`,
          code: 'APP_MANIFEST_OTHER_APP',
        });
      }
      if ((await this.applyIncoming(installation, latest, 'recheck')).outcome === 'gone') {
        throw notInstalled();
      }
    } catch (err) {
      // A ValidationError means the app served something that can't be used. Anything else
      // is a fault in Ghost, which fails the session as it is.
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }
      await this.unavailableUnlessChanged(installation, err);
    }
  }

  /**
   * Fails the session because the app served something that can't be used. Its context
   * says what was wrong, and the request log records it. Nothing is written, so the app
   * opens again once it serves something usable.
   *
   * If the installation changed while the manifest was loading, it may no longer use that
   * URL, so the session returns the installation as it is instead.
   */
  private async unavailableUnlessChanged(
    installation: CurrentInstallation,
    { code, message, context }: InstanceType<typeof errors.ValidationError>,
  ): Promise<void> {
    const revision = await this.store.revision(installation.id);
    if (revision === undefined) {
      throw notInstalled();
    }
    if (revision !== installation.revision) {
      return;
    }
    throw new errors.ConflictError({
      message: 'This app is unavailable.',
      context: `${code}: ${message}${context ? ` (${context})` : ''}`,
      code: 'APP_UNAVAILABLE',
    });
  }

  /**
   * Uninstalls an app. The row is kept as a record of what was installed.
   *
   * Uninstalling an app that's already uninstalled does nothing, so a repeated request
   * doesn't add a second entry to the history.
   */
  async uninstall(context: RequestContext, id: string): Promise<void> {
    const installation = await this.store.current({ id });
    if (!installation) {
      if (!(await this.store.find(id))) {
        throw notFound();
      }
      return;
    }
    const next = transition(installation, { type: 'uninstall' });
    if ((await this.store.apply(installation, next)).outcome !== 'applied') {
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
