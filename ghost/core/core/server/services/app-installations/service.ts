import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  checkManifestUrl,
  compareManifests,
  parseManifest,
  type AppManifest,
  type ParseManifestOptions,
} from '@tryghost/app-contracts/manifest';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import {
  AppInstallationRow,
  CurrentInstallationRow,
  type AppInstallation,
  type CurrentInstallation,
} from './codec';
import type { FetchManifest } from './fetch-manifest';
import { StoredManifest, type AppInstallationStatus } from './schema';

const INSTALLATIONS = 'app_installations';
const MANIFESTS = 'app_installation_manifests';

export type { AppInstallation } from './codec';

/** One field that differs from what the publisher approved. */
export interface AppManifestChange {
  /** Where the change is: a path in the manifest, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

/** What a publisher reviews before installing an app, or before approving changes to one. */
export interface AppInstallationPreview {
  manifest_url: string;
  manifest: AppManifest;
  /** Confirming sends this back, so only the manifest that was reviewed gets installed. */
  digest: string;
  /**
   * The installation of the same app, if the site already has one: the manifest it was
   * approved with and where that was read from, and what would change.
   */
  installation: {
    id: string;
    status: AppInstallationStatus;
    /**
     * Sent back when approving, so the changes approved are the ones that were reviewed:
     * every change to the installation moves it on.
     */
    revision: number;
    manifest_url: string;
    manifest: AppManifest;
    changes: AppManifestChange[];
  } | null;
}

/** A manifest Ghost has fetched and validated, ready to store. */
interface LoadedManifest {
  manifestUrl: string;
  manifest: AppManifest;
  serialised: string;
  digest: string;
}

/**
 * What a publisher reviews and confirms. The same manifest always serialises the same way,
 * as encoding builds it in the schema's key order.
 */
function digestOf(serialisedManifest: string): string {
  return createHash('sha256').update(serialisedManifest).digest('hex');
}

/** The installation the publisher reviewed is not the one being approved, or has ended. */
function notTheReviewedInstallation() {
  return new errors.ConflictError({
    message: 'This installation is not the one for the app that was reviewed.',
    code: 'APP_INSTALLATION_CHANGED',
  });
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
  private fetchManifest: FetchManifest;

  constructor({
    knex,
    recordAction,
    getManifestRules,
    fetchManifest,
  }: {
    knex: Knex;
    recordAction: RecordAppInstallationAction;
    getManifestRules: () => ManifestRules;
    fetchManifest: FetchManifest;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.getManifestRules = getManifestRules;
    this.fetchManifest = fetchManifest;
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
   * Checks the address a manifest is read from before anything is fetched from it, so
   * Ghost never requests an address it would refuse, and what it stores obeys the same
   * rules as the URLs inside a manifest, the length the column allows included.
   *
   * Returns the address as the URL parser reads it, so one spelling of an address is one
   * address: that is what gets stored, and what a later manifest is compared with.
   */
  private checkManifestUrl(manifestUrl: string): string {
    const problem = checkManifestUrl(manifestUrl, this.getManifestRules().allowLocalhost);
    if (problem) {
      throw new errors.ValidationError({
        message: 'The app manifest URL is not valid.',
        code: 'APP_MANIFEST_URL_INVALID',
        context: problem,
      });
    }
    return new URL(manifestUrl).href;
  }

  /**
   * Validates a manifest and resolves its URLs against `baseUrl`, where it was read from.
   * `manifestUrl` is what gets stored: the address the install link pointed at, already
   * checked, which later checks fetch again.
   */
  private load(manifestUrl: string, body: unknown, baseUrl = manifestUrl): LoadedManifest {
    const parsed = parseManifest(body, { manifestUrl: baseUrl, ...this.getManifestRules() });
    if (!parsed.success) {
      throw new errors.ValidationError({
        message: 'The app manifest is not valid.',
        code: 'APP_MANIFEST_INVALID',
        context: parsed.errors
          .map(({ path, message }) => (path ? `${path}: ${message}` : message))
          .join('; '),
      });
    }
    const serialised = z.encode(StoredManifest, parsed.manifest);
    return { manifestUrl, manifest: parsed.manifest, serialised, digest: digestOf(serialised) };
  }

  private async fetchAndLoad(manifestUrl: string): Promise<LoadedManifest> {
    const checked = this.checkManifestUrl(manifestUrl);
    const fetched = await this.fetchManifest(checked);
    return this.load(checked, fetched.body, fetched.url);
  }

  private async currentInstallation(
    appId: string,
    db: Knex | Knex.Transaction = this.knex,
  ): Promise<CurrentInstallation | undefined> {
    const row = await db(`${INSTALLATIONS} as installation`)
      .join(`${MANIFESTS} as approved`, 'approved.id', 'installation.manifest_id')
      .where('installation.current_app_id', appId)
      .first<z.input<typeof CurrentInstallationRow> | undefined>(
        'installation.id',
        'installation.status',
        'installation.manifest_id',
        'installation.pending_manifest_id',
        'installation.revision',
        'approved.manifest_url',
        'approved.manifest',
        'approved.digest',
      );
    return row ? z.decode(CurrentInstallationRow, row) : undefined;
  }

  private changesFrom(current: CurrentInstallation, loaded: LoadedManifest) {
    const { changes } = compareManifests(current.manifest, loaded.manifest);
    const result: AppManifestChange[] = changes.map(({ path, requiresApproval }) => ({
      path,
      requires_approval: requiresApproval,
    }));
    // Where the manifest lives decides what future updates say, so a move needs approval
    // even when every URL in the manifest stays the same.
    if (current.manifest_url !== loaded.manifestUrl) {
      result.unshift({ path: 'manifest_url', requires_approval: true });
    }
    return result;
  }

  private async previewOf(loaded: LoadedManifest): Promise<AppInstallationPreview> {
    const current = await this.currentInstallation(loaded.manifest.id);
    return {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.digest,
      // The approved side comes from the same row the changes were worked out from, so the
      // publisher sees exactly the difference Ghost found.
      installation: current
        ? {
            id: current.id,
            status: current.status,
            revision: current.revision,
            manifest_url: current.manifest_url,
            manifest: current.manifest,
            changes: this.changesFrom(current, loaded),
          }
        : null,
    };
  }

  /** Fetches and checks an app's manifest, for the publisher to review. Stores nothing. */
  async preview(manifestUrl: string): Promise<AppInstallationPreview> {
    return this.previewOf(await this.fetchAndLoad(manifestUrl));
  }

  /**
   * Fetches the manifest again and checks it is the one the publisher reviewed. If the app
   * changed in between, the publisher is asked to review the new version instead.
   */
  private async fetchReviewed(manifestUrl: string, digest: string): Promise<LoadedManifest> {
    const loaded = await this.fetchAndLoad(manifestUrl);
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
   * Installs an app from a manifest that has already been fetched, without a review. Only
   * for code and the REPL: anything a publisher confirms goes through `create`.
   */
  async install(
    context: RequestContext,
    { manifestUrl, manifest }: { manifestUrl: string; manifest: unknown },
  ): Promise<AppInstallation> {
    return this.insert(context, this.load(this.checkManifestUrl(manifestUrl), manifest));
  }

  /**
   * Every install is a new installation with a new ID, including a reinstall: an ended
   * installation is never brought back. The unique `current_app_id` is what refuses a
   * second installation of the same app, so two confirmations racing each other end with
   * exactly one installed and the other told so.
   */
  private async insert(context: RequestContext, loaded: LoadedManifest): Promise<AppInstallation> {
    const { manifest } = loaded;
    const id = new ObjectId().toHexString();
    const manifestId = new ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    // What the read query would return for this row, so the result is decoded from what
    // was written rather than read back: the same codec reads every row, which proves the
    // write readable without a second query.
    const written: z.input<typeof AppInstallationRow> = {
      id,
      app_id: manifest.id,
      status: 'active',
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
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
          manifest_url: written.manifest_url,
          manifest: loaded.serialised,
          digest: loaded.digest,
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

    await this.recordAction({
      context,
      event: 'installed',
      subject: id,
      details: { primary_name: manifest.name, app_id: manifest.id },
    });
    return z.decode(AppInstallationRow, written);
  }

  /**
   * Approves the manifest the publisher reviewed for an installation they already have:
   * changes waiting for approval, or the same app served from somewhere new. The
   * installation keeps its ID and history, and runs the reviewed manifest from now on.
   *
   * `revision` is the installation's revision the review was shown against. Another
   * approval in between moves it on, and what the publisher reviewed is then not what
   * they would be approving, so they are asked to review again.
   *
   * Approving what is already approved changes nothing and records nothing.
   */
  async approve(
    context: RequestContext,
    id: string,
    { manifestUrl, digest, revision }: { manifestUrl: string; digest: string; revision: number },
  ): Promise<AppInstallation> {
    const installation = await this.read(id);
    // An ended installation is never brought back, so there is nothing to fetch for it.
    // The check inside the transaction still covers one ending while the fetch is out.
    if (installation.status === 'uninstalled') {
      throw notTheReviewedInstallation();
    }
    const loaded = await this.fetchReviewed(manifestUrl, digest);

    const approved = await this.knex.transaction(async (trx) => {
      await trx(INSTALLATIONS).where({ id }).forUpdate().first();
      const current = await this.currentInstallation(loaded.manifest.id, trx);
      // The reviewed manifest must belong to this installation, and it must still be
      // installed: anything else is not what the publisher was shown.
      if (!current || current.id !== id) {
        throw notTheReviewedInstallation();
      }
      if (current.revision !== revision) {
        return { stale: true } as const;
      }

      // One reading of what differs, for the decision here and for the record: the preview
      // lists changes from the same comparison, so approve cannot disagree with it.
      const changes = this.changesFrom(current, loaded);
      const sameManifest = changes.length === 0;
      if (sameManifest && current.pending_manifest_id === null) {
        return null;
      }

      const now = toDatabaseDate(new Date());
      // The manifest the publisher just approved. When it is the approved one already,
      // the app had changes waiting and then went back: there is nothing new to keep, only
      // the pending manifest to let go of.
      let manifestId = current.manifest_id;
      if (!sameManifest) {
        manifestId = new ObjectId().toHexString();
        await trx(MANIFESTS).insert({
          id: manifestId,
          installation_id: id,
          manifest_url: loaded.manifestUrl,
          manifest: loaded.serialised,
          digest: loaded.digest,
          requires_approval: changes.some((change) => change.requires_approval),
          created_at: now,
        });
      }
      await trx(INSTALLATIONS)
        .where({ id })
        .update({
          // A suspended app runs again once the changes it was waiting for are approved.
          // Suspended means exactly that today; should a suspension ever have another
          // cause, approving a manifest does not lift it.
          status:
            current.status === 'active' || current.pending_manifest_id !== null
              ? 'active'
              : current.status,
          manifest_id: manifestId,
          pending_manifest_id: null,
          revision: trx.raw('?? + 1', ['revision']),
          updated_at: now,
        });
      return { stale: false, from: current.manifest_id, to: manifestId } as const;
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
