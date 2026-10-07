import { z } from 'zod';
import type { Knex } from 'knex';
import { AppManifestSchema } from '@tryghost/app-contracts/manifest';
import { DbBoolean } from '../../lib/db-types/boolean';
import { DbDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';

// Mirrors schema.js's `isIn` on the column, which is static config and cannot import this.
export const AppInstallationStatus = z.enum(['active', 'suspended', 'uninstalled']);
export type AppInstallationStatus = z.infer<typeof AppInstallationStatus>;

/** An installation as the table holds it. */
export const DbAppInstallation = z.object({
  id: z.string(),
  app_id: z.string(),
  current_app_id: z.string().nullable(),
  status: AppInstallationStatus,
  manifest_id: z.string(),
  pending_manifest_id: z.string().nullable(),
  revision: z.number().int().nonnegative(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

/**
 * The manifest as the table holds it, JSON text, against the manifest itself. The digest
 * is taken from this encoding, and the read decodes exactly it.
 */
export const StoredManifest = DbJson(AppManifestSchema, {
  message: 'The stored manifest is not JSON.',
});

/** A manifest an installation has run or been asked to approve, as the table holds it. */
export const DbAppInstallationManifest = z.object({
  id: z.string(),
  installation_id: z.string(),
  manifest_url: z.string(),
  manifest: StoredManifest,
  digest: z.string(),
  requires_approval: DbBoolean,
  created_at: DbDate,
});

type AppInstallationRow = z.infer<typeof DbAppInstallation>;
type AppInstallationManifestRow = z.infer<typeof DbAppInstallationManifest>;

// What an insert must name. `revision` and `pending_manifest_id` are DB-defaulted.
type AppInstallationInsert = Omit<
  z.input<typeof DbAppInstallation>,
  'revision' | 'pending_manifest_id'
> &
  Partial<Pick<z.input<typeof DbAppInstallation>, 'revision' | 'pending_manifest_id'>>;

// `revision` is only ever moved on in the database itself, as a raw expression, so two
// changes at once cannot both write the same number.
type AppInstallationUpdate = Partial<
  Omit<z.input<typeof DbAppInstallation>, 'revision'> & { revision: Knex.Raw<number> }
>;

declare module 'knex/types/tables' {
  interface Tables {
    app_installations: Knex.CompositeTableType<
      AppInstallationRow,
      AppInstallationInsert,
      AppInstallationUpdate
    >;
    // Append-only: a manifest row is never updated.
    app_installation_manifests: Knex.CompositeTableType<
      AppInstallationManifestRow,
      z.input<typeof DbAppInstallationManifest>,
      never
    >;
  }
}
