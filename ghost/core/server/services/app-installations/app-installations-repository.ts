import type { AppFailureCode } from '@tryghost/app-contracts';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { DbDate, toDatabaseDate } from '../../lib/db-types/date';
import {
  ApprovedManifestFields,
  InstallationFields,
  InstallationRow,
  type Installation,
} from './codec';
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
  source: true,
  requires_approval: true,
  created_at: true,
});

const ManifestContentRow = DbAppInstallationManifest.pick({ id: true, manifest: true });

const DigestAndIconRow = DbAppInstallationManifest.pick({ digest: true, icon_data_url: true });

const BackendKeyRow = DbAppInstallationManifest.pick({ backend_key_thumbprint: true });

const HistoryActionRow = z
  .object({
    id: z.string(),
    actor_id: z.string(),
    actor_name: z.string().nullable(),
    context: z.string().nullable(),
    created_at: DbDate,
  })
  .transform((row): HistoryAction => ({
    id: row.id,
    context: row.context,
    created_at: row.created_at,
    actor: { id: row.actor_id, name: row.actor_name },
  }));

// Both tables have `id` and `created_at`, so each column names the table it's read from.
const INSTALLATION_COLUMNS = [
  ...Object.keys(InstallationFields.shape).map((column) => `installation.${column}`),
  ...Object.keys(ApprovedManifestFields.shape).map((column) => `approved.${column}`),
];

const LockedRow = DbAppInstallation.pick({ status: true, revision: true });

/** What came of `whileUnchanged`: the write's result, or why it didn't write. */
export type WriteOutcome<T> =
  | { status: 'written'; value: T }
  | { status: 'uninstalled' }
  | { status: 'changed' };

/**
 * Runs `run` again when the database picks it as a deadlock's victim, up to three times in
 * all. MySQL rolls back the victim's whole transaction, so `run` must open the transaction
 * itself, to redo all of it.
 */
export async function retryOnDeadlock<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (err) {
      const deadlocked =
        typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_LOCK_DEADLOCK';
      if (deadlocked && attempt < 2) {
        continue;
      }
      throw err;
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return (
    code === 'ER_DUP_ENTRY' || (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
  );
}

/** A manifest row to add for an installation. */
export interface AddedRow {
  loaded: LoadedManifest;
  source: z.infer<typeof AppInstallationManifestSource>;
  requiresApproval: boolean;
  iconDataUrl: string | null;
}

/** Every write to an installation moves its revision on, which ends its app sessions. */
function nextRevision(db: Knex | Knex.Transaction) {
  return { revision: db.raw('?? + 1', ['revision']), updated_at: toDatabaseDate(new Date()) };
}

/**
 * An installation `whileUnchanged` has locked, and the writes to it. Only `whileUnchanged`
 * makes one, so these writes only happen under the lock, and only to that installation.
 */
class LockedInstallation {
  private trx: Knex.Transaction;
  private id: string;

  constructor(trx: Knex.Transaction, id: string) {
    this.trx = trx;
    this.id = id;
  }

  /** Adds a manifest row for the installation, and returns its ID. */
  async addManifest({ loaded, source, requiresApproval, iconDataUrl }: AddedRow): Promise<string> {
    const id = new ObjectId().toHexString();
    await this.trx(MANIFESTS).insert({
      id,
      installation_id: this.id,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      digest: loaded.digest,
      backend_key_thumbprint: loaded.backendKeyThumbprint,
      icon_data_url: iconDataUrl,
      source,
      requires_approval: requiresApproval,
      created_at: toDatabaseDate(new Date()),
    });
    return id;
  }

  /**
   * Makes a manifest the approved manifest and lets go of any pending one. Suspended only
   * means changes are waiting for approval, so with none left it's active.
   */
  async activate(manifestId: string): Promise<void> {
    await this.trx(INSTALLATIONS)
      .where({ id: this.id })
      .update({
        status: 'active',
        manifest_id: manifestId,
        pending_manifest_id: null,
        ...nextRevision(this.trx),
      });
  }

  /**
   * Makes a manifest the pending manifest, which suspends the installation until that's
   * approved. The approved manifest stays as it is.
   */
  async suspend(manifestId: string): Promise<void> {
    await this.trx(INSTALLATIONS)
      .where({ id: this.id })
      .update({ status: 'suspended', pending_manifest_id: manifestId, ...nextRevision(this.trx) });
  }
}

/**
 * The installations and their manifest rows. Manifest rows are only ever added, never
 * changed, and every write to an installation moves its revision on.
 */
/** The app has a current installation, so it can't be installed again. */
export function alreadyInstalled(appId: string) {
  return new errors.ConflictError({
    message: `The app ${appId} is already installed.`,
    code: 'APP_ALREADY_INSTALLED' satisfies AppFailureCode,
  });
}

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

  /** The app's current installation, if it has one. */
  async currentInstallationOf(appId: string): Promise<Installation | undefined> {
    const row = await this.withApprovedManifest()
      .where('installation.current_app_id', appId)
      .first<z.input<typeof InstallationRow> | undefined>(INSTALLATION_COLUMNS);
    return row ? z.decode(InstallationRow, row) : undefined;
  }

  /** Whether the app has a current installation. Reads no manifest, so nothing can fail to decode. */
  async isInstalled(appId: string): Promise<boolean> {
    return Boolean(await this.knex(INSTALLATIONS).where('current_app_id', appId).first('id'));
  }

  /**
   * Reads only the digest and icon copy, skipping the manifest: a row stored under an older
   * contract may no longer decode, but we still compare against it.
   */
  async findDigestAndIcon(id: string): Promise<z.output<typeof DigestAndIconRow> | undefined> {
    const row = await this.knex(MANIFESTS)
      .where({ id })
      .first<z.input<typeof DigestAndIconRow> | undefined>('digest', 'icon_data_url');
    return row ? z.decode(DigestAndIconRow, row) : undefined;
  }

  /**
   * The backend keys replaced for an app signed with this identity key: every key named by
   * a manifest row of any of its installations, ended ones included, other than the current
   * key. Rows are only added for verified manifests, pending ones included, so a key is
   * retired as soon as a verified manifest names a newer one, and uninstalling and
   * installing again doesn't bring it back.
   *
   * The current key is the one the newest installation's pending manifest names, or else its
   * approved manifest's. Every added row becomes one of those straight away, so rows aren't
   * ordered by `created_at`, which comes from each instance's clock and is only to the
   * second. Only installations are, and those are an uninstall and an install apart.
   */
  async retiredBackendKeysOf(appId: string, identityKeyThumbprint: string): Promise<Set<string>> {
    const rows = () =>
      this.knex(`${MANIFESTS} as manifest`)
        .join(`${INSTALLATIONS} as installation`, 'installation.id', 'manifest.installation_id')
        .where({
          'installation.app_id': appId,
          'installation.identity_key_thumbprint': identityKeyThumbprint,
        });
    const current = rows()
      .whereRaw('?? = coalesce(??, ??)', [
        'manifest.id',
        'installation.pending_manifest_id',
        'installation.manifest_id',
      ])
      .orderBy('installation.created_at', 'desc')
      .orderBy('installation.id', 'desc')
      .limit(1)
      .select('manifest.backend_key_thumbprint');
    const retired = await rows()
      .whereNot('manifest.backend_key_thumbprint', current)
      .distinct<z.input<typeof BackendKeyRow>[]>('manifest.backend_key_thumbprint');
    return new Set(retired.map((row) => z.decode(BackendKeyRow, row).backend_key_thumbprint));
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
   * other gets `APP_ALREADY_INSTALLED`. Concurrent inserts can deadlock over that column, so
   * the caller runs the transaction with `retryOnDeadlock`.
   */
  async insert(
    loaded: LoadedManifest,
    iconDataUrl: string | null,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<Installation> {
    const { manifest } = loaded;
    const id = new ObjectId().toHexString();
    const manifestId = new ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    // The row as the read query would return it. Decoding it with the same codec gives the
    // result without reading the row back.
    const written: z.input<typeof InstallationRow> = {
      id,
      app_id: manifest.id,
      identity_key_thumbprint: loaded.identityKeyThumbprint,
      status: 'active',
      manifest_id: manifestId,
      pending_manifest_id: null,
      revision: 0,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      icon_data_url: iconDataUrl,
      created_at: now,
      updated_at: now,
    };
    try {
      await transacting(INSTALLATIONS).insert({
        id,
        app_id: written.app_id,
        current_app_id: written.app_id,
        identity_key_thumbprint: written.identity_key_thumbprint,
        status: written.status,
        manifest_id: written.manifest_id,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      throw isUniqueViolation(err) ? alreadyInstalled(manifest.id) : err;
    }
    await transacting(MANIFESTS).insert({
      id: manifestId,
      installation_id: id,
      manifest_url: written.manifest_url,
      manifest: loaded.serialised,
      digest: loaded.digest,
      backend_key_thumbprint: loaded.backendKeyThumbprint,
      icon_data_url: iconDataUrl,
      source: 'install',
      requires_approval: false,
      created_at: now,
    });
    return z.decode(InstallationRow, written);
  }

  /**
   * Locks the installation and runs `write` on it, unless it has been uninstalled or changed
   * since `installation` was read. Every write moves the revision on, so a different revision
   * means it changed. The lock is held until the caller's transaction ends.
   */
  async whileUnchanged<T>(
    installation: Installation,
    write: (locked: LockedInstallation) => Promise<T>,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<WriteOutcome<T>> {
    const row = await transacting(INSTALLATIONS)
      .where({ id: installation.id })
      .forUpdate()
      .first<z.input<typeof LockedRow> | undefined>('status', 'revision');
    const locked = row ? z.decode(LockedRow, row) : undefined;
    if (!locked || locked.status === 'uninstalled') {
      return { status: 'uninstalled' };
    }
    if (locked.revision !== installation.revision) {
      return { status: 'changed' };
    }
    return {
      status: 'written',
      value: await write(new LockedInstallation(transacting, installation.id)),
    };
  }

  /** Returns false if it was already uninstalled. */
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
