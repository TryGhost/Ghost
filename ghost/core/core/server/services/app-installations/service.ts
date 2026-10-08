import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import { parseManifest, type ParseManifestOptions } from '@tryghost/app-contracts/manifest';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import { AppInstallationRow, type AppInstallation } from './codec';
import { StoredManifest } from './schema';

const INSTALLATIONS = 'app_installations';
const MANIFESTS = 'app_installation_manifests';

export type { AppInstallation } from './codec';

/**
 * What a publisher reviews and confirms. The same manifest always serialises the same way,
 * as encoding builds it in the schema's key order.
 */
function digestOf(serialisedManifest: string): string {
  return createHash('sha256').update(serialisedManifest).digest('hex');
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return (
    code === 'ER_DUP_ENTRY' || (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
  );
}

/** What the manifest is checked against: where Ghost is served from, and in which mode. */
export type ManifestRules = Omit<ParseManifestOptions, 'manifestUrl'>;

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

  /** Installations with the approved manifest each one runs. */
  private withApprovedManifest() {
    return this.knex(`${INSTALLATIONS} as installation`)
      .join(`${MANIFESTS} as approved`, 'approved.id', 'installation.manifest_id')
      .select<z.input<typeof AppInstallationRow>[]>(
        'installation.id',
        'installation.app_id',
        'installation.status',
        'approved.manifest_url',
        'approved.manifest',
        'installation.created_at',
        'installation.updated_at',
      );
  }

  /** The apps installed on this site now, suspended ones included. Ended ones are not listed. */
  async browse(): Promise<AppInstallation[]> {
    const rows = await this.withApprovedManifest()
      .whereNot('installation.status', 'uninstalled')
      .orderBy('installation.created_at', 'asc')
      .orderBy('installation.id', 'asc');
    return rows.map((row) => z.decode(AppInstallationRow, row));
  }

  /** One installation by ID, whether it has ended or not. */
  async read(id: string): Promise<AppInstallation> {
    const [row] = await this.withApprovedManifest().where('installation.id', id);
    if (!row) {
      throw new errors.NotFoundError({ message: 'App installation not found.' });
    }
    return z.decode(AppInstallationRow, row);
  }

  /**
   * Installs an app from a manifest Ghost itself fetched from `manifestUrl`.
   *
   * Every install is a new installation with a new ID, including a reinstall: an ended
   * installation is never brought back. The unique `current_app_id` is what refuses a
   * second installation of the same app, so two confirmations racing each other end with
   * exactly one installed and the other told so.
   */
  async install(
    context: RequestContext,
    { manifestUrl, manifest }: { manifestUrl: string; manifest: unknown },
  ): Promise<AppInstallation> {
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
    const manifestId = new ObjectId().toHexString();
    const serialisedManifest = z.encode(StoredManifest, parsed.manifest);
    const now = toDatabaseDate(new Date());
    // What the read query would return for this row, so the result is decoded from what
    // was written rather than read back: the same codec reads every row, which proves the
    // write readable without a second query.
    const written: z.input<typeof AppInstallationRow> = {
      id,
      app_id: parsed.manifest.id,
      status: 'active',
      manifest_url: parsed.manifestUrl,
      manifest: serialisedManifest,
      created_at: now,
      updated_at: now,
    };
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
          // As checked, not as given: the contract keeps it within the column's width.
          manifest_url: written.manifest_url,
          manifest: serialisedManifest,
          digest: digestOf(serialisedManifest),
          requires_approval: false,
          created_at: now,
        });
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
    return z.decode(AppInstallationRow, written);
  }

  /**
   * Ends an installation. The row stays, so the site keeps a record of what was installed.
   *
   * Uninstalling one that has already ended does nothing and records nothing, so a
   * repeated request cannot add a second uninstall to the history.
   */
  async uninstall(context: RequestContext, id: string): Promise<void> {
    const installation = await this.read(id);

    const ended = await this.knex(INSTALLATIONS)
      .where({ id })
      .whereNot('status', 'uninstalled')
      .update({
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
