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
  PendingManifestRow,
  type AppInstallation,
  type CurrentInstallation,
} from './codec';
import {
  changesFrom,
  decideOnManifest,
  type AppManifestChange,
  type ManifestDecision,
} from './decide-on-manifest';
import { buildHistory, approvalManifestIds, type HistoryAction } from './history';
import type { LoadedManifest, LoadManifest } from './load-manifest';
import { DbAppInstallationManifest, type AppInstallationStatus } from './schema';

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
 * `revision` is the installation's revision when the session started. Every change to the
 * installation increments it, so the session ends once the two differ.
 */
export interface AppSession {
  revision: number;
  installation: AppInstallation;
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
 * with its approved manifest. By ID, uninstalled rows are skipped by status. By app ID, the
 * lookup uses `current_app_id`, which uninstalling clears.
 */
async function currentInstallation(
  by: { id: string } | { appId: string },
  db: Knex | Knex.Transaction,
): Promise<CurrentInstallation | undefined> {
  const query = joinApprovedManifest(db);
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
  );
  return row ? z.decode(CurrentInstallationRow, row) : undefined;
}

async function pendingManifest(
  trx: Knex.Transaction,
  current: CurrentInstallation,
): Promise<z.output<typeof PendingManifestRow> | null> {
  if (current.pending_manifest_id === null) {
    return null;
  }
  const row = await trx(MANIFESTS)
    .where({ id: current.pending_manifest_id })
    .first<z.input<typeof PendingManifestRow> | undefined>('id', 'digest');
  return row ? z.decode(PendingManifestRow, row) : null;
}

/**
 * Writes a manifest decision for an installation. Approval and the re-check at session
 * start both use it, so they always store a manifest the same way.
 *
 * Call it in a transaction that has locked the installation row, with `current` read in
 * that same transaction, since the decision was made from it.
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
 * Every write increments the revision. Returns the approved manifest ID before and after,
 * or null if there was nothing to write.
 */
export async function keepManifest(
  trx: Knex.Transaction,
  current: CurrentInstallation,
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
  const now = toDatabaseDate(new Date());

  let manifestId = current.manifest_id;
  if (kind === 'use_pending' && current.pending_manifest_id !== null) {
    manifestId = current.pending_manifest_id;
  } else if (changes.length > 0 || resumes) {
    manifestId = new ObjectId().toHexString();
    await trx(MANIFESTS).insert({
      id: manifestId,
      installation_id: current.id,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      digest: loaded.digest,
      source: resumes ? 'resume' : source,
      requires_approval: kind === 'suspend',
      created_at: now,
    });
  }

  if (waits) {
    await trx(INSTALLATIONS)
      .where({ id: current.id })
      .update({
        status: 'suspended',
        pending_manifest_id: manifestId,
        revision: trx.raw('?? + 1', ['revision']),
        updated_at: now,
      });
    return { from: current.manifest_id, to: current.manifest_id };
  }
  await trx(INSTALLATIONS)
    .where({ id: current.id })
    .update({
      // Suspended only means changes are waiting for approval, so with none left it's active.
      status: 'active',
      manifest_id: manifestId,
      pending_manifest_id: null,
      revision: trx.raw('?? + 1', ['revision']),
      updated_at: now,
    });
  return { from: current.manifest_id, to: manifestId };
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
    const [row] = await this.withApprovedManifest().where('installation.id', id);
    if (!row) {
      throw new errors.NotFoundError({ message: 'App installation not found.' });
    }
    const installation: AppInstallation = z.decode(AppInstallationRow, row);
    if (withHistory) {
      installation.history = await this.historyOf(id);
    }
    return installation;
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

  private async previewOf(loaded: LoadedManifest): Promise<AppInstallationPreview> {
    const current = await currentInstallation({ appId: loaded.manifest.id }, this.knex);
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
    const installation = await this.read(id);
    // No need to fetch for an uninstalled installation. The check in the transaction
    // covers an uninstall that happens during the fetch.
    if (installation.status === 'uninstalled') {
      throw uninstalled();
    }
    const loaded = await this.fetchReviewed(manifestUrl, digest);

    const approved = await this.knex.transaction(async (trx) => {
      await trx(INSTALLATIONS).where({ id }).forUpdate().first();
      const current = await currentInstallation({ appId: loaded.manifest.id }, trx);
      // The reviewed manifest must be for this installation, and it must still be
      // installed. If the app's current installation is missing or a different one,
      // either this one was uninstalled during the fetch, or the manifest is for a
      // different app.
      if (!current || current.id !== id) {
        throw installation.app_id === loaded.manifest.id
          ? uninstalled()
          : forAnotherApp(loaded.manifest.id);
      }
      if (current.revision !== revision) {
        return { stale: true } as const;
      }

      const decision = decideOnManifest({
        current,
        pending: await pendingManifest(trx, current),
        loaded,
      });
      const kept = await keepManifest(trx, current, loaded, decision, 'approval');
      return kept ? ({ stale: false, ...kept } as const) : null;
    });

    if (approved?.stale) {
      throw new errors.ConflictError({
        message: 'The installation changed while the app was being reviewed.',
        code: 'APP_INSTALLATION_CHANGED',
        errorDetails: await this.previewOf(loaded),
      });
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

  /**
   * Starts an app session when Admin opens an app page. Re-checks the manifest, then
   * returns the installation and its current revision, which Admin decides what to show
   * from. Nothing about the session is stored.
   */
  async startSession(id: string): Promise<AppSession> {
    await this.recheck(id);
    const installation = await this.read(id);
    // Uninstalled after the re-check, or during a re-check this session shared.
    if (installation.status === 'uninstalled') {
      throw notInstalled();
    }
    return { revision: installation.revision, installation };
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
    const before = await currentInstallation({ id }, this.knex);
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
      const current = await currentInstallation({ id }, this.knex);
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

    await this.knex.transaction(async (trx) => {
      await trx(INSTALLATIONS).where({ id }).forUpdate().first();
      const current = await currentInstallation({ id }, trx);
      if (!current) {
        throw notInstalled();
      }
      if (current.revision !== before.revision) {
        return;
      }
      const decision = decideOnManifest({
        current,
        pending: await pendingManifest(trx, current),
        loaded,
      });
      await keepManifest(trx, current, loaded, decision, 'update');
    });
  }

  /**
   * Uninstalls an app. The row is kept as a record of what was installed.
   *
   * Uninstalling an app that's already uninstalled does nothing, so a repeated request
   * doesn't add a second entry to the history.
   */
  async uninstall(context: RequestContext, id: string): Promise<void> {
    const installation = await this.read(id);

    const ended = await this.knex(INSTALLATIONS)
      .where({ id })
      .whereNot('status', 'uninstalled')
      .update({
        // In the same update as `status`, so the two always agree.
        current_app_id: null,
        status: 'uninstalled',
        revision: this.knex.raw('?? + 1', ['revision']),
        updated_at: toDatabaseDate(new Date()),
      });
    if (ended === 0) {
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
