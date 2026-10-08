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

/** A field as the publisher reads it, with the paths Ghost reports changes under. */
interface Field {
  field: string;
  label: string;
  value: (manifest: AppManifest) => string | null;
}

const FIELDS: Field[] = [
  { field: 'name', label: 'Name', value: (m) => m.name },
  { field: 'description', label: 'Description', value: (m) => m.description },
  { field: 'author.name', label: 'Developer', value: (m) => m.author.name },
  { field: 'author.url', label: 'Developer’s website', value: (m) => m.author.url },
  { field: 'accent_color', label: 'Accent color', value: (m) => m.accent_color },
  // A publisher reads the icon as one thing, named or served by the app.
  { field: 'icon', label: 'Icon', value: (m) => ('url' in m.icon ? m.icon.url : m.icon.name) },
];

const SURFACE_LABELS: Record<string, string> = {
  admin_page: 'Page in Admin',
};

/** One field per surface position on either side, read as the surface's URL. */
function surfaceFields(approved: AppManifest, reviewed: AppManifest): Field[] {
  const count = Math.max(approved.surfaces.length, reviewed.surfaces.length);
  return Array.from({ length: count }, (_, index) => {
    const type = (reviewed.surfaces[index] ?? approved.surfaces[index])?.type;
    return {
      field: `surfaces[${index}]`,
      label: (type && SURFACE_LABELS[type]) ?? 'Surface',
      value: (m) => m.surfaces[index]?.url ?? null,
    };
  });
}

/** The top of a path: `cards` for `cards[0].name`. */
const topOf = (path: string) => path.split(/[.[]/, 1)[0];

/** Whether a change is to this field, or to something inside it. */
const within = (change: AppManifestChange, field: string) =>
  change.path === field || change.path.startsWith(`${field}.`);

/**
 * What changed between the approved manifest and the one being reviewed, one row per field
 * as the publisher reads it, with the changes that need approval first. Ghost says which
 * fields changed; the values come from the two manifests. A move is not a row: where the
 * app runs is listed as a surface, and the review warns about the move on its own.
 */
export function describeChanges(
  approved: ManifestVersion,
  reviewed: ManifestVersion,
  changes: AppManifestChange[],
): ChangeRow[] {
  const fields = [...FIELDS, ...surfaceFields(approved.manifest, reviewed.manifest)];
  const rows: ChangeRow[] = [];
  for (const { field, label, value } of fields) {
    const own = changes.filter((change) => within(change, field));
    if (own.length) {
      rows.push({
        field,
        label,
        before: value(approved.manifest),
        after: value(reviewed.manifest),
        requiresApproval: own.some((change) => change.requires_approval),
      });
    }
  }

  // A field added to the manifest after this was written: shown by its name, as JSON.
  const known = new Set([...fields.map(({ field }) => topOf(field)), 'manifest_url']);
  for (const change of changes) {
    const top = topOf(change.path);
    if (known.has(top)) {
      continue;
    }
    known.add(top);
    const raw = (manifest: AppManifest) => {
      const value = (manifest as unknown as Record<string, unknown>)[top];
      return value === undefined ? null : JSON.stringify(value);
    };
    rows.push({
      field: top,
      label: top,
      before: raw(approved.manifest),
      after: raw(reviewed.manifest),
      requiresApproval: changes.some((c) => topOf(c.path) === top && c.requires_approval),
    });
  }

  // Stable: within each group, rows keep the order above.
  return rows.sort((a, b) => Number(b.requiresApproval) - Number(a.requiresApproval));
}
