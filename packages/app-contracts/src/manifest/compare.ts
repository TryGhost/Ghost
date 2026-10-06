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

type Leaf = string | number | boolean | null;

function collectLeaves(value: unknown, path: string, leaves: Map<string, Leaf>): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeaves(item, `${path}[${index}]`, leaves));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectLeaves(item, path ? `${path}.${key}` : key, leaves);
    }
    return;
  }
  leaves.set(path, value as Leaf);
}

function leavesOf(manifest: AppManifest): Map<string, Leaf> {
  const leaves = new Map<string, Leaf>();
  collectLeaves(manifest, '', leaves);
  return leaves;
}

/**
 * Compares the manifest a publisher approved with a newer one, field by field.
 *
 * Both must be parsed manifests, so their URLs are already resolved: an app served from
 * somewhere new changes every URL, and that needs approval like any other URL change.
 * A field that appears or disappears counts as changed.
 */
export function compareManifests(approved: AppManifest, next: AppManifest): ManifestComparison {
  const before = leavesOf(approved);
  const after = leavesOf(next);
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();

  const changes = paths
    .filter((path) => before.get(path) !== after.get(path) || before.has(path) !== after.has(path))
    .map((path) => ({ path, requiresApproval: !SILENT_PATHS.has(path) }));

  return { changes, requiresApproval: changes.some((change) => change.requiresApproval) };
}
