import type {
  AppManifest,
  AppManifestChange,
} from '@tryghost/admin-x-framework/api/app-installations';

/** A manifest and where it was read from: what was approved, or what is being reviewed. */
export interface ManifestVersion {
  manifest_url: string;
  manifest: AppManifest;
}

/** One thing that changed, as a publisher reads it. `null` means it isn't there on that side. */
export interface ChangeRow {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
  requiresApproval: boolean;
}

const LABELS: Record<string, string> = {
  manifest_url: 'Checks for updates at',
  name: 'Name',
  description: 'Description',
  'author.name': 'Developer',
  'author.url': 'Developer’s website',
  accent_color: 'Accent color',
  icon: 'Icon',
};

const SURFACE_LABELS: Record<string, string> = {
  admin_page: 'Page in Admin',
};

/**
 * The field a changed path belongs to. A publisher reads an icon or a surface as one thing,
 * so the paths inside it are shown together.
 */
function fieldOf(path: string): string {
  if (path.startsWith('surfaces[')) {
    return path.slice(0, path.indexOf(']') + 1);
  }
  if (path.startsWith('icon.')) {
    return 'icon';
  }
  return path;
}

function surfaceAt(version: ManifestVersion, field: string) {
  const index = Number(field.slice('surfaces['.length, -1));
  return version.manifest.surfaces[index];
}

function valueAt(version: ManifestVersion, field: string): string | null {
  if (field === 'manifest_url') {
    return version.manifest_url;
  }
  if (field === 'icon') {
    const { icon } = version.manifest;
    return 'url' in icon ? icon.url : icon.name;
  }
  if (field.startsWith('surfaces[')) {
    return surfaceAt(version, field)?.url ?? null;
  }
  // A field Admin doesn't know yet, added to the manifest after this was written.
  let value: unknown = version.manifest;
  for (const key of field.match(/[^.[\]]+/g) ?? []) {
    value =
      value !== null && typeof value === 'object'
        ? (value as Record<string, unknown>)[key]
        : undefined;
  }
  if (value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function labelOf(field: string, approved: ManifestVersion, reviewed: ManifestVersion): string {
  if (field.startsWith('surfaces[')) {
    const type = (surfaceAt(reviewed, field) ?? surfaceAt(approved, field))?.type;
    return (type && SURFACE_LABELS[type]) ?? 'Surface';
  }
  return LABELS[field] ?? field;
}

/**
 * What changed between the approved manifest and the one being reviewed, one row per field:
 * the changes that need approval first, each group in the order Ghost listed them.
 */
export function describeChanges(
  approved: ManifestVersion,
  reviewed: ManifestVersion,
  changes: AppManifestChange[],
): ChangeRow[] {
  const rows = new Map<string, ChangeRow>();
  for (const change of changes) {
    const field = fieldOf(change.path);
    const row = rows.get(field);
    if (row) {
      row.requiresApproval ||= change.requires_approval;
      continue;
    }
    rows.set(field, {
      field,
      label: labelOf(field, approved, reviewed),
      before: valueAt(approved, field),
      after: valueAt(reviewed, field),
      requiresApproval: change.requires_approval,
    });
  }
  // Stable: within each group, rows keep the order Ghost listed them in.
  return [...rows.values()].sort((a, b) => Number(b.requiresApproval) - Number(a.requiresApproval));
}
