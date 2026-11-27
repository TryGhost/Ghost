import { z } from 'zod';
import type { Knex } from 'knex';
import { AppManifestSchema, ManifestChangeSchema } from '@tryghost/app-contracts/manifest';
import { DbBoolean } from '../../lib/db-types/boolean';
import { DbDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';
import type { RowUpdate, SchemaTable } from '../../lib/db-types/tables';

// Mirrors schema.ts's `isIn` on the column, which stays static config and does not import this.
export const AppInstallationStatus = z.enum(['active', 'suspended', 'uninstalled']);
export type AppInstallationStatus = z.infer<typeof AppInstallationStatus>;

/** An installation as the table holds it. */
export const DbAppInstallation = z.object({
  id: z.string(),
  app_id: z.string(),
  current_app_id: z.string().nullable(),
  identity_key_thumbprint: z.string(),
  status: AppInstallationStatus,
  manifest_id: z.string(),
  pending_manifest_id: z.string().nullable(),
  revision: z.number().int().nonnegative(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

export const StoredManifest = DbJson(AppManifestSchema, {
  message: 'The stored manifest is not JSON.',
});

/**
 * What differs from the manifest approved when a row was added: fields by path, then access in
 * the registry's order, in the shape App Contracts defines.
 */
export const StoredChanges = DbJson(z.array(ManifestChangeSchema), {
  message: 'The stored changes are not JSON.',
});

// Mirrors schema.ts's `isIn` on the column, which stays static config and does not import this.
export const AppInstallationManifestSource = z.enum(['install', 'approval', 'update', 'resume']);

/** A manifest an installation has run or been asked to approve, as the table holds it. */
export const DbAppInstallationManifest = z.object({
  id: z.string(),
  installation_id: z.string(),
  manifest_url: z.string(),
  manifest: StoredManifest,
  digest: z.string(),
  backend_key_thumbprint: z.string(),
  icon_data_url: z.string().nullable(),
  source: AppInstallationManifestSource,
  requires_approval: DbBoolean,
  changes: StoredChanges,
  created_at: DbDate,
});

// `revision` is only incremented in SQL (`revision + 1`), so two concurrent changes can't
// write the same number.
type AppInstallationUpdate = Omit<RowUpdate<'app_installations'>, 'revision'> & {
  revision?: Knex.Raw<number>;
};

declare module 'knex/types/tables' {
  interface Tables {
    app_installations: SchemaTable<'app_installations', { update: AppInstallationUpdate }>;
    // Append-only: a manifest row is never updated.
    app_installation_manifests: SchemaTable<'app_installation_manifests', { update: never }>;
  }
}
