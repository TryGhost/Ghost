import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { DbDate, toDatabaseDate } from '../../lib/db-types/date';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import {
  AppInstallationRow,
  CurrentInstallationRow,
  type AppInstallation,
  type CurrentInstallation,
} from './codec';
import { buildHistory, approvalManifestIds, type HistoryAction } from './history';
import {
  changesFrom,
  transition,
  type AppManifestChange,
  type NewManifestRow,
  type Transition,
} from './lifecycle';
import type { LoadedManifest, LoadManifest } from './load-manifest';
import { DbAppInstallation, DbAppInstallationManifest, type AppInstallationStatus } from './schema';

const INSTALLATIONS = 'app_installations';
const MANIFESTS = 'app_installation_manifests';

const HistoryManifestRow = DbAppInstallationManifest.pick({
  id: true,
  manifest_url: true,
  source: true,
  requires_approval: true,
  created_at: true,
});

const ManifestContentRow = DbAppInstallationManifest.pick({ id: true, manifest: true });

const HistoryActionRow = z
  .object({
    id: z.string(),
    event: z.string(),
    actor_id: z.string(),
    actor_name: z.string().nullable(),
    context: z.string().nullable(),
    created_at: DbDate,
  })
  .transform((row): HistoryAction => ({
    id: row.id,
    event: row.event,
    context: row.context,
    created_at: row.created_at,
    actor: { id: row.actor_id, name: row.actor_name },
  }));

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

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return (
    code === 'ER_DUP_ENTRY' || (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
  );
}

function joinApprovedManifest(db: Knex | Knex.Transaction) {
  return db(`${INSTALLATIONS} as installation`).join(
    `${MANIFESTS} as approved`,
    'approved.id',
    'installation.manifest_id',
  );
}

/**
 * Finds an installation that hasn't been uninstalled, by installation ID or app ID, joined
 * with its approved manifest and the pending one's digest. By ID, uninstalled rows are
 * skipped by status. By app ID, the lookup uses `current_app_id`, which uninstalling clears.
 */
async function currentInstallation(
  by: { id: string } | { appId: string },
  db: Knex | Knex.Transaction,
): Promise<CurrentInstallation | undefined> {
  const query = joinApprovedManifest(db).leftJoin(
    `${MANIFESTS} as pending`,
    'pending.id',
    'installation.pending_manifest_id',
  );
  if ('id' in by) {
    query.where('installation.id', by.id).whereNot('installation.status', 'uninstalled');
  } else {
    query.where('installation.current_app_id', by.appId);
  }
  const row = await query.first<z.input<typeof CurrentInstallationRow> | undefined>(
    'installation.id',
    'installation.app_id',
    'installation.status',
    'installation.manifest_id',
    'installation.pending_manifest_id',
    'installation.revision',
    'approved.manifest_url',
    'approved.manifest',
    'pending.digest as pending_digest',
  );
  return row ? z.decode(CurrentInstallationRow, row) : undefined;
}

/**
 * What applying a transition did. `applied` says the approved manifest ID before and after.
 * Nothing is written if the transition goes nowhere (`unchanged`), or if the installation has
 * been uninstalled since it was read (`gone`) or changed (`stale`).
 */
type Applied =
  | { outcome: 'applied'; from: string; to: string }
  | { outcome: 'unchanged' | 'gone' | 'stale' };

/** A transition that stores the incoming manifest as a new row. */
type StoringTransition = Extract<Transition, { stores: NewManifestRow }>;

const RevisionRow = DbAppInstallation.pick({ revision: true });

/** Reads the revision of an installation that hasn't been uninstalled. */
function currentRevision(db: Knex | Knex.Transaction, id: string) {
  return db(INSTALLATIONS)
    .where({ id })
    .whereNot('status', 'uninstalled')
    .first<z.input<typeof RevisionRow> | undefined>('revision');
}

function revisionOf(row: z.input<typeof RevisionRow> | undefined): number | undefined {
  return row ? z.decode(RevisionRow, row).revision : undefined;
}

/** Writes a transition, in `applyTransition`'s transaction. */
async function writeTransition(
  trx: Knex.Transaction,
  installation: CurrentInstallation,
  next: Transition,
  incoming: LoadedManifest | undefined,
): Promise<Applied> {
  if (next.to === 'same') {
    return { outcome: 'unchanged' };
  }
  const now = toDatabaseDate(new Date());
  const changed = { revision: trx.raw('?? + 1', ['revision']), updated_at: now };
  const unmoved = {
    outcome: 'applied',
    from: installation.manifest_id,
    to: installation.manifest_id,
  } as const;

  if (next.to === 'uninstalled') {
    await trx(INSTALLATIONS)
      .where({ id: installation.id })
      // In the same update as `status`, so the two always agree.
      .update({ ...changed, current_app_id: null, status: 'uninstalled' });
    return unmoved;
  }

  let manifestId: string;
  if ('approvedManifestId' in next) {
    manifestId = next.approvedManifestId;
  } else {
    if (!incoming) {
      throw new errors.IncorrectUsageError({
        message: 'A transition that stores a manifest needs the manifest it stores.',
      });
    }
    manifestId = new ObjectId().toHexString();
    await trx(MANIFESTS).insert({
      id: manifestId,
      installation_id: installation.id,
      manifest_url: incoming.manifestUrl,
      manifest: incoming.serialised,
      digest: incoming.digest,
      source: next.stores.source,
      requires_approval: next.stores.requiresApproval,
      created_at: now,
    });
  }

  if (next.to === 'suspended') {
    await trx(INSTALLATIONS)
      .where({ id: installation.id })
      .update({ ...changed, status: 'suspended', pending_manifest_id: manifestId });
    return unmoved;
  }
  await trx(INSTALLATIONS)
    .where({ id: installation.id })
    .update({ ...changed, status: 'active', manifest_id: manifestId, pending_manifest_id: null });
  return { outcome: 'applied', from: installation.manifest_id, to: manifestId };
}

/**
 * Applies `next`, a transition decided from the installation as it was read. Every change
 * moves the revision on, so the transition only goes ahead while the installation is still
 * at `installation.revision`. Uninstalling doesn't depend on what the installation runs, so
 * it goes ahead at any revision. A transition that stores a row takes the manifest it stores.
 */
function applyTransition(
  knex: Knex,
  installation: CurrentInstallation,
  next: StoringTransition,
  incoming: LoadedManifest,
): Promise<Applied>;
function applyTransition(
  knex: Knex,
  installation: CurrentInstallation,
  next: Exclude<Transition, StoringTransition>,
): Promise<Applied>;
async function applyTransition(
  knex: Knex,
  installation: CurrentInstallation,
  next: Transition,
  incoming?: LoadedManifest,
): Promise<Applied> {
  return knex.transaction(async (trx): Promise<Applied> => {
    const revision = revisionOf(await currentRevision(trx, installation.id).forUpdate());
    if (revision === undefined) {
      return { outcome: 'gone' };
    }
    if (revision !== installation.revision && next.to !== 'uninstalled') {
      return { outcome: 'stale' };
    }
    return writeTransition(trx, installation, next, incoming);
  });
}

export class AppInstallationsService {
  private knex: Knex;
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
    this.knex = knex;
    this.recordAction = recordAction;
    this.loadManifest = loadManifest;
  }

  /** Installations joined with their approved manifests, in the shape the Admin API returns. */
  private withApprovedManifest() {
    return joinApprovedManifest(this.knex).select<z.input<typeof AppInstallationRow>[]>(
      'installation.id',
      'installation.app_id',
      'installation.status',
      'installation.revision',
      'approved.manifest_url',
      'approved.manifest',
      'installation.created_at',
      'installation.updated_at',
    );
  }

  /** Lists installed apps, suspended ones included. Uninstalled apps aren't listed. */
  async browse(): Promise<AppInstallation[]> {
    const rows = await this.withApprovedManifest()
      .whereNot('installation.status', 'uninstalled')
      .orderBy('installation.created_at', 'asc')
      .orderBy('installation.id', 'asc');
    return rows.map((row) => z.decode(AppInstallationRow, row));
  }

  /**
   * Unlike `browse`, this also returns uninstalled apps.
   * That way their details page still works.
   */
  async read(
    id: string,
    { withHistory = false }: { withHistory?: boolean } = {},
  ): Promise<AppInstallation> {
    const installation = await this.find(id);
    if (!installation) {
      throw notFound();
    }
    if (withHistory) {
      installation.history = await this.historyOf(id);
    }
    return installation;
  }

  /** An installation by ID, uninstalled or not. */
  private async find(id: string): Promise<AppInstallation | undefined> {
    const [row] = await this.withApprovedManifest().where('installation.id', id);
    return row ? z.decode(AppInstallationRow, row) : undefined;
  }

  private async historyOf(id: string): Promise<AppInstallation['history']> {
    const manifestRows = this.knex(MANIFESTS)
      .where({ installation_id: id })
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .select<z.input<typeof HistoryManifestRow>[]>(
        'id',
        'manifest_url',
        'source',
        'requires_approval',
        'created_at',
      );
    const actionRows = this.knex('actions as action')
      // Left join, so actions by deleted users still show, just without a name.
      .leftJoin('users as actor', 'actor.id', 'action.actor_id')
      .where({ 'action.resource_type': 'app_installation', 'action.resource_id': id })
      .orderBy('action.created_at', 'asc')
      .orderBy('action.id', 'asc')
      .select<z.input<typeof HistoryActionRow>[]>(
        'action.id',
        'action.event',
        'action.actor_id',
        'action.context',
        'action.created_at',
        'actor.name as actor_name',
      );
    const [manifestData, actionData] = await Promise.all([manifestRows, actionRows]);
    const manifests = manifestData.map((row) => z.decode(HistoryManifestRow, row));
    const actions = actionData.map((row) => z.decode(HistoryActionRow, row));
    return buildHistory(
      manifests,
      actions,
      await this.loadManifestContents(approvalManifestIds(actions)),
    );
  }

  /**
   * Loads the contents of these manifests, by id.
   * A row that no longer decodes is skipped, so one bad row can't break the page.
   */
  private async loadManifestContents(ids: string[]): Promise<Map<string, AppManifest>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.knex(MANIFESTS)
      .whereIn('id', ids)
      .select<z.input<typeof ManifestContentRow>[]>('id', 'manifest');
    const contents = new Map<string, AppManifest>();
    for (const row of rows) {
      const decoded = ManifestContentRow.safeDecode(row);
      if (decoded.success) {
        contents.set(decoded.data.id, decoded.data.manifest);
      }
    }
    return contents;
  }

  private async previewOf(incoming: LoadedManifest): Promise<AppInstallationPreview> {
    const installation = await currentInstallation({ appId: incoming.manifest.id }, this.knex);
    return {
      manifest_url: incoming.manifestUrl,
      manifest: incoming.manifest,
      digest: incoming.digest,
      // The approved manifest shown is the one the changes were computed from, so the
      // review matches the list of changes.
      installation: installation
        ? {
            id: installation.id,
            status: installation.status,
            revision: installation.revision,
            manifest_url: installation.manifest_url,
            manifest: installation.manifest,
            changes: changesFrom(installation, incoming),
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
    return this.insert(context, await this.fetchReviewed(manifestUrl, digest));
  }

  /**
   * Every install creates a new installation with a new ID, reinstalls included; an
   * uninstalled installation is never reused. The unique `current_app_id` column blocks a
   * second installation of the same app, so when two installs race, one succeeds and the
   * other gets `APP_ALREADY_INSTALLED`.
   */
  private async insert(context: RequestContext, loaded: LoadedManifest): Promise<AppInstallation> {
    const { manifest } = loaded;
    const id = new ObjectId().toHexString();
    const manifestId = new ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    // The row as the read query would return it. Decoding it with the same codec gives the
    // result without reading the row back.
    const written: z.input<typeof AppInstallationRow> = {
      id,
      app_id: manifest.id,
      status: 'active',
      revision: 0,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      created_at: now,
      updated_at: now,
    };
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.knex.transaction(async (trx) => {
          await trx(INSTALLATIONS).insert({
            id,
            app_id: written.app_id,
            current_app_id: written.app_id,
            status: written.status,
            manifest_id: manifestId,
            created_at: now,
            updated_at: now,
          });
          await trx(MANIFESTS).insert({
            id: manifestId,
            installation_id: id,
            manifest_url: written.manifest_url,
            manifest: loaded.serialised,
            digest: loaded.digest,
            source: 'install',
            requires_approval: false,
            created_at: now,
          });
        });
        break;
      } catch (err) {
        // Duplicate inserts can deadlock when several confirmations compete for
        // the unique current_app_id. MySQL rolls back the victim's transaction;
        // retry the whole write so it either commits or sees the winning install.
        if ((err as { code?: unknown } | null)?.code === 'ER_LOCK_DEADLOCK' && attempt < 2) {
          continue;
        }
        if (isUniqueViolation(err)) {
          throw new errors.ConflictError({
            message: `The app ${manifest.id} is already installed.`,
            code: 'APP_ALREADY_INSTALLED',
          });
        }
        throw err;
      }
    }

    await this.recordAction({
      context,
      event: 'installed',
      subject: id,
      details: { primary_name: manifest.name, app_id: manifest.id },
    });
    return z.decode(AppInstallationRow, written);
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
    const installation = await currentInstallation({ id }, this.knex);
    // No need to fetch for an uninstalled installation. Applying the transition at the
    // revision read here covers an uninstall or a change that happens during the fetch.
    if (!installation) {
      throw (await this.find(id)) ? uninstalled() : notFound();
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
   * so they always store a manifest the same way. The transition is decided from the
   * installation as it was read, and only written while the installation is still at that
   * revision, so it still holds when it's written.
   */
  private async applyIncoming(
    installation: CurrentInstallation,
    incoming: LoadedManifest,
    type: 'recheck' | 'approve',
  ): Promise<Applied> {
    const next = transition(installation, { type, manifest: incoming });
    if (!('stores' in next)) {
      return applyTransition(this.knex, installation, next);
    }
    return applyTransition(this.knex, installation, next, incoming);
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
   * the approved manifest.
   *
   * Everything is looked up by installation ID, never app ID, so a re-check that started
   * before an uninstall can't bring that installation back or change a newer installation
   * of the same app. If the installation changed while the manifest was loading, the
   * re-check does nothing, because the latest manifest may be older than that change.
   */
  private async recheckOnce(id: string): Promise<void> {
    const installation = await currentInstallation({ id }, this.knex);
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
    const revision = revisionOf(await currentRevision(this.knex, installation.id));
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
    const installation = await currentInstallation({ id }, this.knex);
    if (!installation) {
      if (!(await this.find(id))) {
        throw notFound();
      }
      return;
    }
    const next = transition(installation, { type: 'uninstall' });
    if ((await applyTransition(this.knex, installation, next)).outcome !== 'applied') {
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
