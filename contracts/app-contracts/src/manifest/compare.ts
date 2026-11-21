import { compareAccess } from './access.ts';
import type { ManifestChange } from './changes-schema.ts';
import { changeRequiresApproval } from './changes.ts';
import type { AppManifest } from './schema.ts';

/**
 * The only fields that may change without the publisher approving it again: text, colour
 * and the backend key. Access isn't a field here: its changes decide their own approval.
 * Everything else says who the app is or is a URL Ghost loads or links to, and a field added
 * to the manifest later needs approval until it is listed here.
 *
 * The backend key is vouched for by the identity key, which signed the manifest naming
 * it, so an app can replace a leaked one without every site having to approve it.
 */
const SILENT_PATHS = new Set(['description', 'accent_color', 'icon.name']);
const SILENT_PREFIXES = ['backend_key.'];

const isSilent = (path: string) =>
  SILENT_PATHS.has(path) || SILENT_PREFIXES.some((prefix) => path.startsWith(prefix));

/**
 * What `compareManifests` finds. Each change is in the snake-case shape Ghost stores and serves;
 * the comparison itself is a JavaScript API, so its own fields are camel case.
 */
export interface ManifestComparison {
  /**
   * Everything that differs: the fields, by path, then access, in the registry's order. Empty
   * when nothing changed.
   */
  changes: ManifestChange[];
  /** Whether any of the changes needs approval. */
  requiresApproval: boolean;
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

// Access is compared by meaning, not field by field, so it's left out here.
function leavesOf({ access: _access, ...manifest }: AppManifest): Map<string, string> {
  const leaves = new Map<string, string>();
  collectLeaves(manifest, '', leaves);
  return leaves;
}

/**
 * Compares the manifest a publisher approved with a newer one, field by field. A field
 * that appears or disappears counts as changed.
 *
 * Access is compared by meaning instead, one change per scope: a scope added or removed, or
 * one the backend may now, or no longer, use. Only the changes that widen access need approval,
 * and reordering is no change.
 *
 * The manifest names its own `manifest_url`, which decides what future updates say, so a
 * move needs approval like any other change of URL.
 *
 * Without an approved manifest, as at install, no field counts as changed and every scope is
 * added.
 */
export function compareManifests(
  approved: AppManifest | undefined,
  next: AppManifest,
): ManifestComparison {
  const after = leavesOf(next);
  const before = approved ? leavesOf(approved) : after;
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();

  const changes: ManifestChange[] = [
    ...paths
      .filter((path) => before.get(path) !== after.get(path))
      .map((path): ManifestChange => ({
        kind: 'field',
        path,
        requires_approval: !isSilent(path),
      })),
    ...compareAccess(approved?.access, next.access),
  ];

  return { changes, requiresApproval: changes.some(changeRequiresApproval) };
}
