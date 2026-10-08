import type { AppManifest } from './schema.ts';

/**
 * The only fields that may change without the publisher approving it again: text and
 * colour. Everything else says who the app is or is a URL Ghost loads or links to, and a
 * field added to the manifest later needs approval until it is listed here.
 */
const SILENT_PATHS = new Set(['description', 'accent_color', 'icon.name']);

export interface ManifestChange {
  /** Where in the manifest the change is, e.g. `surfaces[0].url`. */
  path: string;
  /** Whether this change needs the publisher to approve it before it applies. */
  requiresApproval: boolean;
}

export interface ManifestComparison {
  /** Every field that differs, in a stable order. Empty when nothing changed. */
  changes: ManifestChange[];
  /** Whether any of the changes needs approval. */
  requiresApproval: boolean;
}

/** A parsed manifest and the address it is read from, as stored or as just checked. */
export interface ManifestVersion {
  manifestUrl: string;
  manifest: AppManifest;
}

function entriesOf(value: unknown, path: string): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((item, index) => [`${path}[${index}]`, item]);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => [path ? `${path}.${key}` : key, item]);
  }
  return [];
}

// Each leaf is kept as JSON, so values of different types never compare equal. An empty
// list or object is a leaf too: otherwise a field that arrives as `[]` would not count as
// a change.
function collectLeaves(value: unknown, path: string, leaves: Map<string, string>): void {
  const entries = entriesOf(value, path);
  if (entries.length === 0) {
    leaves.set(path, JSON.stringify(value));
    return;
  }
  for (const [itemPath, item] of entries) {
    collectLeaves(item, itemPath, leaves);
  }
}

function leavesOf(manifest: AppManifest): Map<string, string> {
  const leaves = new Map<string, string>();
  collectLeaves(manifest, '', leaves);
  return leaves;
}

/**
 * Compares the manifest a publisher approved with a newer one, field by field.
 *
 * Both must be parsed manifests, so their URLs are already resolved: an app served from
 * somewhere new changes every URL, and that needs approval like any other URL change.
 * A field that appears or disappears counts as changed.
 *
 * Where the manifest is read from is compared too, as `manifest_url`, listed first. It
 * decides what future updates say, so a move needs approval even when every URL inside
 * the manifest stays the same, as they do when all of them are absolute.
 */
export function compareManifests(
  approved: ManifestVersion,
  next: ManifestVersion,
): ManifestComparison {
  const before = leavesOf(approved.manifest);
  const after = leavesOf(next.manifest);
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();

  const changes = paths
    .filter((path) => before.get(path) !== after.get(path))
    .map((path) => ({ path, requiresApproval: !SILENT_PATHS.has(path) }));
  if (approved.manifestUrl !== next.manifestUrl) {
    changes.unshift({ path: 'manifest_url', requiresApproval: true });
  }

  return { changes, requiresApproval: changes.some((change) => change.requiresApproval) };
}
