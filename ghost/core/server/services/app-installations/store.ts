import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { DbDate, toDatabaseDate } from '../../lib/db-types/date';
import {
  AppInstallationRow,
  CurrentInstallationRow,
  type AppInstallation,
  type AppInstallationHistoryEntry,
  type CurrentInstallation,
} from './codec';
import { approvalManifestIds, buildHistory, type HistoryAction } from './history';
import type { Transition } from './lifecycle';
import type { LoadedManifest } from './load-manifest';
import { DbAppInstallation, DbAppInstallationManifest } from './schema';

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

/**
 * What applying a transition did. `applied` says the approved manifest ID before and after.
 * Nothing is written if the transition goes nowhere (`unchanged`), or if the installation has
 * been uninstalled since it was read (`gone`) or changed (`stale`).
 */
export type Applied =
  | { outcome: 'applied'; from: string; to: string }
  | { outcome: 'unchanged' | 'gone' | 'stale' };

const MAX_TRANSACTION_ATTEMPTS = 3;

const DatabaseError = z.object({ code: z.string() });

function errorCode(err: unknown): string | undefined {
  return DatabaseError.safeParse(err).data?.code;
}

function isUniqueViolation(err: unknown): boolean {
  const code = errorCode(err);
  return code === 'ER_DUP_ENTRY' || code?.startsWith('SQLITE_CONSTRAINT') === true;
}

/**
 * Runs `write` in a transaction. MySQL rolls back a deadlock victim's whole transaction, so
 * one that loses a deadlock is started again, up to three attempts in all.
 */
async function transactionRetryingDeadlocks(
  knex: Knex,
  write: (trx: Knex.Transaction) => Promise<void>,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await knex.transaction(write);
    } catch (err) {
      if (errorCode(err) !== 'ER_LOCK_DEADLOCK' || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw err;
      }
    }
  }
}

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

/** Writes a transition, in `apply`'s transaction. */
async function writeTransition(
  trx: Knex.Transaction,
  installation: CurrentInstallation,
  next: Transition,
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
    const { manifest, source, requiresApproval } = next.stores;
    manifestId = new ObjectId().toHexString();
    await trx(MANIFESTS).insert({
      id: manifestId,
      installation_id: installation.id,
      manifest_url: manifest.manifestUrl,
      manifest: manifest.serialised,
      digest: manifest.digest,
      source,
      requires_approval: requiresApproval,
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
 * The installations and their manifest rows. A manifest row is never changed once written,
 * and every write to an installation increments its revision.
 */
export class AppInstallationsStore {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  /** Installed apps, suspended ones included, oldest first. Uninstalled apps aren't listed. */
  async list(): Promise<AppInstallation[]> {
    const rows = await this.withApprovedManifest()
      .whereNot('installation.status', 'uninstalled')
      .orderBy('installation.created_at', 'asc')
      .orderBy('installation.id', 'asc');
    return rows.map((row) => z.decode(AppInstallationRow, row));
  }

  /** An installation by ID, uninstalled or not. */
  async find(id: string): Promise<AppInstallation | undefined> {
    const [row] = await this.withApprovedManifest().where('installation.id', id);
    return row ? z.decode(AppInstallationRow, row) : undefined;
  }

  async history(id: string): Promise<AppInstallationHistoryEntry[]> {
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
      await this.manifestContents(approvalManifestIds(actions)),
    );
  }

  /**
   * Finds an installation that hasn't been uninstalled, by installation ID or app ID, joined
   * with its approved manifest and the pending one's digest. By ID, uninstalled rows are
   * skipped by status. By app ID, the lookup uses `current_app_id`, which uninstalling clears.
   */
  async current(by: { id: string } | { appId: string }): Promise<CurrentInstallation | undefined> {
    const query = this.joinApprovedManifest().leftJoin(
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

  /** The revision of an installation that hasn't been uninstalled, by ID. */
  async revision(id: string): Promise<number | undefined> {
    return revisionOf(await currentRevision(this.knex, id));
  }

  /**
   * Every install creates a new installation with a new ID, reinstalls included; an
   * uninstalled installation is never reused. The unique `current_app_id` column blocks a
   * second installation of the same app, so when two installs race, one succeeds and the
   * other gets `APP_ALREADY_INSTALLED`.
   */
  async install(incoming: LoadedManifest): Promise<AppInstallation> {
    const { manifest } = incoming;
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
      manifest_url: incoming.manifestUrl,
      manifest: incoming.serialised,
      created_at: now,
      updated_at: now,
    };
    try {
      // Duplicate inserts can deadlock when several confirmations compete for the unique
      // current_app_id. Starting the write again means it either commits or sees the
      // winning install.
      await transactionRetryingDeadlocks(this.knex, async (trx) => {
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
          manifest: incoming.serialised,
          digest: incoming.digest,
          source: 'install',
          requires_approval: false,
          created_at: now,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new errors.ConflictError({
          message: `The app ${manifest.id} is already installed.`,
          code: 'APP_ALREADY_INSTALLED',
        });
      }
      throw err;
    }
    return z.decode(AppInstallationRow, written);
  }

  /**
   * Applies `next`, a transition decided from the installation as it was read. Every change
   * moves the revision on, so the transition only goes ahead while the installation is still
   * at `installation.revision`. A transition that doesn't depend on what the installation runs
   * can go ahead `atAnyRevision`.
   */
  async apply(
    installation: CurrentInstallation,
    next: Transition,
    { atAnyRevision = false }: { atAnyRevision?: boolean } = {},
  ): Promise<Applied> {
    return this.knex.transaction(async (trx): Promise<Applied> => {
      const revision = revisionOf(await currentRevision(trx, installation.id).forUpdate());
      if (revision === undefined) {
        return { outcome: 'gone' };
      }
      if (revision !== installation.revision && !atAnyRevision) {
        return { outcome: 'stale' };
      }
      return writeTransition(trx, installation, next);
    });
  }

  private joinApprovedManifest() {
    return this.knex(`${INSTALLATIONS} as installation`).join(
      `${MANIFESTS} as approved`,
      'approved.id',
      'installation.manifest_id',
    );
  }

  /** Installations joined with their approved manifests, in the shape the Admin API returns. */
  private withApprovedManifest() {
    return this.joinApprovedManifest().select<z.input<typeof AppInstallationRow>[]>(
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

  /**
   * Loads the contents of these manifests, by id.
   * A row that no longer decodes is skipped, so one bad row can't break the page.
   */
  private async manifestContents(ids: string[]): Promise<Map<string, AppManifest>> {
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
}
