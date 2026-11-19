import {
  type AccessChange,
  type AccessLine,
  type AppPermissionKey,
  describeScopes,
  splitChanges,
} from '@tryghost/app-contracts';
import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';

/** A kind of change to an app's access, in the scope registry's words, one line per resource. */
export interface AccessChangeGroup {
  kind: AccessChange['change'];
  heading: string;
  lines: AccessLine[];
}

type Headings = Record<AccessChangeGroup['kind'], string>;

/** For changes that took effect: an install, an update or an approval. */
const HEADINGS: Headings = {
  added: 'New access',
  backend_added: 'New for its backend, at any time',
  removed: 'No longer has',
  backend_removed: 'No longer for its backend, at any time',
};

/**
 * For changes a suspension asked for, which only take effect once approved. Worded as what was
 * asked at the time, so a history entry stays true once it is approved, withdrawn or replaced.
 */
const PENDING_HEADINGS: Headings = {
  added: 'Asked for',
  backend_added: 'Asked for its backend, at any time',
  removed: 'Would drop',
  backend_removed: 'Would drop for its backend, at any time',
};

/**
 * The scopes each kind of change covers, as a publisher reads them. A scope added for the backend
 * is new for both the app and its backend, and one removed while the backend could use it is gone
 * from both.
 */
function scopesByKind(
  changes: readonly AccessChange[],
): Record<AccessChange['change'], AppPermissionKey[]> {
  const scopes = (match: (change: AccessChange) => boolean) =>
    changes.filter(match).map(({ scope }) => scope);
  return {
    added: scopes(({ change }) => change === 'added'),
    backend_added: scopes(
      ({ change, backend }) => change === 'backend_added' || (change === 'added' && backend),
    ),
    removed: scopes(({ change }) => change === 'removed'),
    backend_removed: scopes(
      ({ change, backend }) => change === 'backend_removed' || (change === 'removed' && backend),
    ),
  };
}

/**
 * Groups changes to an app's access as a publisher reads them: what it gains, what its backend
 * may now use on its own, and what it gives up. Kinds with nothing in them are left out.
 * `pending` words them as what a suspension asked for.
 */
export function describeAccessChanges(
  changes: readonly AccessChange[],
  { pending = false }: { pending?: boolean } = {},
): AccessChangeGroup[] {
  const headings = pending ? PENDING_HEADINGS : HEADINGS;
  const byKind = scopesByKind(changes);
  return (Object.keys(HEADINGS) as AccessChangeGroup['kind'][]).flatMap((kind) => {
    const lines = describeScopes(byKind[kind]);
    return lines.length ? [{ kind, heading: headings[kind], lines }] : [];
  });
}

/**
 * How an update changes the access its review lists: which of the new version's scopes are new,
 * for the app and for its backend, and what each no longer has, one line per resource.
 */
export interface AccessMarks {
  added: ReadonlySet<AppPermissionKey>;
  backendAdded: ReadonlySet<AppPermissionKey>;
  removed: AccessLine[];
  backendRemoved: AccessLine[];
}

export function markAccessChanges(changes: readonly AccessChange[]): AccessMarks {
  const byKind = scopesByKind(changes);
  return {
    added: new Set(byKind.added),
    backendAdded: new Set(byKind.backend_added),
    removed: describeScopes(byKind.removed),
    backendRemoved: describeScopes(byKind.backend_removed),
  };
}

const ENDS_A_SUSPENSION: ReadonlySet<AppInstallationHistoryEntry['event']> = new Set([
  'suspended',
  'resumed',
  'changes_approved',
  'uninstalled',
]);

const sameAccessChanges = (a: AppInstallationHistoryEntry, b: AppInstallationHistoryEntry) =>
  JSON.stringify(splitChanges(a.changes ?? []).access) ===
  JSON.stringify(splitChanges(b.changes ?? []).access);

/**
 * The access changes to show with each history entry, newest first as the history is. A
 * suspension's changes are left out once an approval granted exactly them, as the approval shows
 * them; one withdrawn, replaced or still waiting keeps what it asked for.
 */
export function historyAccessChanges(
  entries: readonly AppInstallationHistoryEntry[],
): AccessChange[][] {
  return entries.map((entry, index) => {
    const access = splitChanges(entry.changes ?? []).access;
    if (entry.event !== 'suspended') {
      return access;
    }
    const outcome = entries
      .slice(0, index)
      .reverse()
      .find(({ event }) => ENDS_A_SUSPENSION.has(event));
    return outcome?.event === 'changes_approved' && sameAccessChanges(entry, outcome) ? [] : access;
  });
}
