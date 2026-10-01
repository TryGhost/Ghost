import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { parseManifest, type AppManifest } from '@tryghost/app-contracts/manifest';
import { fromDatabaseDate, toDatabaseDate, type DatabaseDate } from '../../lib/db-types/date';
import type { RecordAppInstallationAction, RequestContext } from './actions';

const TABLE = 'app_installations';
// The width of the manifest_url column.
const MANIFEST_URL_MAX_LENGTH = 2000;

interface AppInstallationRow {
  id: string;
  app_id: string;
  active_app_id: string | null;
  manifest_url: string;
  manifest: string;
  created_at: DatabaseDate;
  updated_at: DatabaseDate | null;
}

/** One site's approval of one app, as the Admin API returns it. */
export interface AppInstallation {
  id: string;
  app_id: string;
  status: 'active' | 'uninstalled';
  manifest_url: string;
  manifest: AppManifest;
  created_at: Date;
  updated_at: Date | null;
}

function toInstallation(row: AppInstallationRow): AppInstallation {
  return {
    id: row.id,
    app_id: row.app_id,
    status: row.active_app_id === null ? 'uninstalled' : 'active',
    manifest_url: row.manifest_url,
    manifest: JSON.parse(row.manifest) as AppManifest,
    created_at: fromDatabaseDate(row.created_at),
    updated_at: row.updated_at === null ? null : fromDatabaseDate(row.updated_at),
  };
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return (
    code === 'ER_DUP_ENTRY' || (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
  );
}

/** What the manifest is checked against: where Ghost is served from, and in which mode. */
export interface ManifestRules {
  ghostUrls: string[];
  allowLocalhost: boolean;
}

export class AppInstallationsService {
  private knex: Knex;
  private recordAction: RecordAppInstallationAction;
  private getManifestRules: () => ManifestRules;

  constructor({
    knex,
    recordAction,
    getManifestRules,
  }: {
    knex: Knex;
    recordAction: RecordAppInstallationAction;
    getManifestRules: () => ManifestRules;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.getManifestRules = getManifestRules;
  }

  /** The apps installed on this site now. Ended installations are not listed. */
  async browse(): Promise<AppInstallation[]> {
    const rows = await this.knex<AppInstallationRow>(TABLE)
      .whereNotNull('active_app_id')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc');
    return rows.map(toInstallation);
  }

  /** One installation by ID, whether it is still active or not. */
  async read(id: string): Promise<AppInstallation> {
    const row = await this.knex<AppInstallationRow>(TABLE).where({ id }).first();
    if (!row) {
      throw new errors.NotFoundError({ message: 'App installation not found.' });
    }
    return toInstallation(row);
  }

  /**
   * Installs an app from a manifest Ghost itself fetched from `manifestUrl`.
   *
   * Every install is a new installation with a new ID, including a reinstall: an ended
   * installation is never brought back. The unique `active_app_id` is what refuses a
   * second active installation of the same app, so two confirmations racing each other
   * end with exactly one installed and the other told so.
   */
  async install(
    context: RequestContext,
    { manifestUrl, manifest }: { manifestUrl: string; manifest: unknown },
  ): Promise<AppInstallation> {
    if (manifestUrl.length > MANIFEST_URL_MAX_LENGTH) {
      throw new errors.ValidationError({ message: 'The app manifest URL is too long.' });
    }
    const parsed = parseManifest(manifest, { manifestUrl, ...this.getManifestRules() });
    if (!parsed.success) {
      throw new errors.ValidationError({
        message: 'The app manifest is not valid.',
        context: parsed.errors
          .map(({ path, message }) => (path ? `${path}: ${message}` : message))
          .join('; '),
      });
    }

    const id = new ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    try {
      await this.knex(TABLE).insert({
        id,
        app_id: parsed.manifest.id,
        active_app_id: parsed.manifest.id,
        manifest_url: manifestUrl,
        manifest: JSON.stringify(parsed.manifest),
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new errors.ConflictError({
          message: `The app ${parsed.manifest.id} is already installed.`,
        });
      }
      throw err;
    }

    await this.recordAction({
      context,
      event: 'installed',
      subject: id,
      details: { primary_name: parsed.manifest.name, app_id: parsed.manifest.id },
    });
    return this.read(id);
  }

  /**
   * Ends an installation. The row stays, so the site keeps a record of what was installed.
   *
   * Uninstalling one that has already ended does nothing and records nothing, so a
   * repeated request cannot add a second uninstall to the history.
   */
  async uninstall(context: RequestContext, id: string): Promise<void> {
    const installation = await this.read(id);

    const ended = await this.knex(TABLE)
      .where({ id })
      .whereNotNull('active_app_id')
      .update({ active_app_id: null, updated_at: toDatabaseDate(new Date()) });
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
