import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { DbDate, toDatabaseDate } from '../../lib/db-types/date';
import { InstallationRow, type Installation } from './codec';
import type { HistoryAction, HistoryManifest } from './history';
import type { LoadedManifest } from './load-manifest';
import {
  DbAppInstallation,
  DbAppInstallationManifest,
  type AppInstallationManifestSource,
} from './schema';

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

const ManifestDigestRow = DbAppInstallationManifest.pick({ digest: true });

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

const INSTALLATION_COLUMNS = [
  'installation.id',
  'installation.app_id',
  'installation.status',
  'installation.manifest_id',
  'installation.pending_manifest_id',
  'installation.revision',
  'approved.manifest_url',
  'approved.manifest',
  'installation.created_at',
  'installation.updated_at',
];

const LockedRow = DbAppInstallation.pick({ status: true, revision: true });

/**
 * Why a write decided from an installation didn't go ahead: since it was read, it has been
 * uninstalled, or something else changed it.
 */
export type Refused = 'uninstalled' | 'changed';

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return (
    code === 'ER_DUP_ENTRY' || (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
  );
}

/** Who added a manifest row, and whether its changes need approval. */
interface AddedManifest {
  source: z.infer<typeof AppInstallationManifestSource>;
  requiresApproval: boolean;
}

/** Every write to an installation moves its revision on, which ends its app sessions. */
function nextRevision(db: Knex | Knex.Transaction) {
  return { revision: db.raw('?? + 1', ['revision']), updated_at: toDatabaseDate(new Date()) };
}

/**
 * The installations and their manifest rows. Manifest rows are only ever added, never
 * changed, and every write to an installation moves its revision on.
 */
export class AppInstallationsRepository {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  /** Installations that haven't been uninstalled, oldest first. */
  async list(): Promise<Installation[]> {
    const rows = await this.withApprovedManifest()
      .whereNot('installation.status', 'uninstalled')
      .orderBy('installation.created_at', 'asc')
      .orderBy('installation.id', 'asc')
      .select<z.input<typeof InstallationRow>[]>(INSTALLATION_COLUMNS);
    return rows.map((row) => z.decode(InstallationRow, row));
  }

  /** An installation by ID, uninstalled or not. */
  async find(id: string): Promise<Installation | undefined> {
    const row = await this.withApprovedManifest()
      .where('installation.id', id)
      .first<z.input<typeof InstallationRow> | undefined>(INSTALLATION_COLUMNS);
    return row ? z.decode(InstallationRow, row) : undefined;
  }

  /**
   * The app's installation that hasn't been uninstalled, if any. It's found by
   * `current_app_id`, which uninstalling clears.
   */
  async currentInstallationOf(appId: string): Promise<Installation | undefined> {
    const row = await this.withApprovedManifest()
      .where('installation.current_app_id', appId)
      .first<z.input<typeof InstallationRow> | undefined>(INSTALLATION_COLUMNS);
    return row ? z.decode(InstallationRow, row) : undefined;
  }

  /**
   * A manifest row's digest, by ID. The manifest itself isn't read, so a row stored under an
   * older contract, which may no longer decode, can still be compared against.
   */
  async findDigest(id: string): Promise<string | undefined> {
    const row = await this.knex(MANIFESTS)
      .where({ id })
      .first<z.input<typeof ManifestDigestRow> | undefined>('digest');
    return row ? z.decode(ManifestDigestRow, row).digest : undefined;
  }

  /** An installation's manifest rows and staff actions, oldest first. */
  async historyRows(
    id: string,
  ): Promise<{ manifests: HistoryManifest[]; actions: HistoryAction[] }> {
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
    return {
      manifests: manifestData.map((row) => z.decode(HistoryManifestRow, row)),
      actions: actionData.map((row) => z.decode(HistoryActionRow, row)),
    };
  }

  /**
   * Loads the contents of these manifests, by id.
   * A row that no longer decodes is skipped, so one bad row can't break the page.
   */
  async loadManifestContents(ids: string[]): Promise<Map<string, AppManifest>> {
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

  /**
   * Every install creates a new installation with a new ID, reinstalls included; an
   * uninstalled installation is never reused. The unique `current_app_id` column blocks a
   * second installation of the same app, so when two installs race, one succeeds and the
   * other gets `APP_ALREADY_INSTALLED`.
   */
  async insert(loaded: LoadedManifest): Promise<Installation> {
    const { manifest } = loaded;
    const id = new ObjectId().toHexString();
    const manifestId = new ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    // The row as the read query would return it. Decoding it with the same codec gives the
    // result without reading the row back.
    const written: z.input<typeof InstallationRow> = {
      id,
      app_id: manifest.id,
      status: 'active',
      manifest_id: manifestId,
      pending_manifest_id: null,
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
            manifest_id: written.manifest_id,
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
    return z.decode(InstallationRow, written);
  }

  /**
   * Runs `write` in a transaction that has locked the installation, if it's still at the
   * revision it was read at. Every write moves the revision on, so the installation is then
   * exactly as it was read, and so is anything decided from it.
   */
  whileUnchanged<T>(
    installation: Installation,
    write: (trx: Knex.Transaction) => Promise<T>,
  ): Promise<T | Refused> {
    return this.knex.transaction(async (trx) => {
      const row = await trx(INSTALLATIONS)
        .where({ id: installation.id })
        .forUpdate()
        .first<z.input<typeof LockedRow> | undefined>('status', 'revision');
      const locked = row ? z.decode(LockedRow, row) : undefined;
      if (!locked || locked.status === 'uninstalled') {
        return 'uninstalled';
      }
      if (locked.revision !== installation.revision) {
        return 'changed';
      }
      return write(trx);
    });
  }

  /** Adds a manifest row for an installation, and returns its ID. */
  async addManifest(
    trx: Knex.Transaction,
    installationId: string,
    loaded: LoadedManifest,
    { source, requiresApproval }: AddedManifest,
  ): Promise<string> {
    const id = new ObjectId().toHexString();
    await trx(MANIFESTS).insert({
      id,
      installation_id: installationId,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      digest: loaded.digest,
      source,
      requires_approval: requiresApproval,
      created_at: toDatabaseDate(new Date()),
    });
    return id;
  }

  /**
   * Makes a manifest the installation's approved manifest and lets go of any pending one.
   * Suspended only means changes are waiting for approval, so with none left it's active.
   */
  async activate(trx: Knex.Transaction, id: string, manifestId: string): Promise<void> {
    await trx(INSTALLATIONS)
      .where({ id })
      .update({
        status: 'active',
        manifest_id: manifestId,
        pending_manifest_id: null,
        ...nextRevision(trx),
      });
  }

  /**
   * Makes a manifest the installation's pending manifest, which suspends it until that's
   * approved. The approved manifest stays as it is.
   */
  async suspend(trx: Knex.Transaction, id: string, manifestId: string): Promise<void> {
    await trx(INSTALLATIONS)
      .where({ id })
      .update({ status: 'suspended', pending_manifest_id: manifestId, ...nextRevision(trx) });
  }

  /**
   * Uninstalls an installation, unless it's already uninstalled. Returns whether it was
   * uninstalled now.
   */
  async uninstall(id: string): Promise<boolean> {
    const ended = await this.knex(INSTALLATIONS)
      .where({ id })
      .whereNot('status', 'uninstalled')
      .update({
        // In the same update as `status`, so the two always agree.
        current_app_id: null,
        status: 'uninstalled',
        ...nextRevision(this.knex),
      });
    return ended > 0;
  }

  private withApprovedManifest() {
    return this.knex(`${INSTALLATIONS} as installation`).join(
      `${MANIFESTS} as approved`,
      'approved.id',
      'installation.manifest_id',
    );
  }
}
