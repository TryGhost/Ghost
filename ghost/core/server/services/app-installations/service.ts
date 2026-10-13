import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import { compareManifests, type AppManifest } from '@tryghost/app-contracts/manifest';
import { DbDate, toDatabaseDate } from '../../lib/db-types/date';
import type { RecordAppInstallationAction, RequestContext } from './actions';
import {
  AppInstallationRow,
  CurrentInstallationRow,
  PendingManifestRow,
  type AppInstallation,
  type CurrentInstallation,
} from './codec';
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
  /**
   * Confirming sends this back, so only what was reviewed gets installed: the manifest,
   * and the address it is read from.
   */
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

/** The installation has ended, so there is nothing left to approve for it. */
function uninstalled() {
  return new errors.ConflictError({
    message: 'This app has been uninstalled.',
    code: 'APP_INSTALLATION_UNINSTALLED',
  });
}

/** The reviewed manifest belongs to some other app than the one installed. */
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

export class AppInstallationsService {
  private knex: Knex;
  private recordAction: RecordAppInstallationAction;
  private loadManifest: LoadManifest;

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
      );
    return row ? z.decode(CurrentInstallationRow, row) : undefined;
  }

  private changesFrom(current: CurrentInstallation, loaded: LoadedManifest): AppManifestChange[] {
    const { changes } = compareManifests(
      { manifestUrl: current.manifest_url, manifest: current.manifest },
      { manifestUrl: loaded.manifestUrl, manifest: loaded.manifest },
    );
    return changes.map(({ path, requiresApproval }) => ({
      path,
      requires_approval: requiresApproval,
    }));
  }

  private async previewOf(loaded: LoadedManifest): Promise<AppInstallationPreview> {
    const current = await this.currentInstallation(loaded.manifest.id);
    return {
      manifest_url: loaded.manifestUrl,
      manifest: loaded.manifest,
      digest: loaded.reviewed,
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
    return this.previewOf(await this.loadManifest(manifestUrl));
  }

  /**
   * Fetches the manifest again and checks it is the one the publisher reviewed, from the
   * address they reviewed it at. If the app changed in between, the publisher is asked to
   * review the new version instead.
   */
  private async fetchReviewed(manifestUrl: string, digest: string): Promise<LoadedManifest> {
    const loaded = await this.loadManifest(manifestUrl);
    if (loaded.reviewed !== digest) {
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
      throw uninstalled();
    }
    const loaded = await this.fetchReviewed(manifestUrl, digest);

    const approved = await this.knex.transaction(async (trx) => {
      await trx(INSTALLATIONS).where({ id }).forUpdate().first();
      const current = await this.currentInstallation(loaded.manifest.id, trx);
      // The reviewed manifest must belong to this installation, and it must still be
      // installed. The app has no current installation, or another one, either because
      // this one ended while the manifest was being fetched or because the manifest is
      // for some other app.
      if (!current || current.id !== id) {
        throw installation.app_id === loaded.manifest.id
          ? uninstalled()
          : forAnotherApp(loaded.manifest.id);
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
      // the pending manifest to let go of. When it is the pending one, that row is the
      // approved one from now on rather than a copy of it.
      let manifestId = current.manifest_id;
      const pendingRow = current.pending_manifest_id
        ? await trx(MANIFESTS)
            .where({ id: current.pending_manifest_id })
            .first<z.input<typeof PendingManifestRow> | undefined>('id', 'manifest_url', 'digest')
        : undefined;
      const pending = pendingRow ? z.decode(PendingManifestRow, pendingRow) : undefined;
      if (
        pending &&
        pending.manifest_url === loaded.manifestUrl &&
        pending.digest === loaded.digest
      ) {
        manifestId = pending.id;
      } else if (!sameManifest) {
        manifestId = new ObjectId().toHexString();
        await trx(MANIFESTS).insert({
          id: manifestId,
          installation_id: id,
          manifest_url: loaded.manifestUrl,
          manifest: loaded.serialised,
          digest: loaded.digest,
          source: 'approval',
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
