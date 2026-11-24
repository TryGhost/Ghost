import {
  type ScopeChange,
  type ScopeLine,
  type AppPermissionKey,
  describeScopes,
  splitChanges,
} from '@tryghost/app-contracts';
import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';

/** A kind of change to an app's access, in the scope registry's words, one line per resource. */
export interface ScopeChangeGroup {
  kind: ScopeChange['change'];
  heading: string;
  lines: ScopeLine[];
}

type Headings = Record<ScopeChangeGroup['kind'], string>;

/** For changes that took effect: an install, an update or an approval. */
const HEADINGS: Headings = {
  added: 'New access',
  removed: 'No longer has',
};

/**
 * For changes a suspension asked for, which only take effect once approved. Worded as what was
 * asked at the time, so a history entry stays true once it is approved, withdrawn or replaced.
 */
const PENDING_HEADINGS: Headings = {
  added: 'Asked for',
  removed: 'Would drop',
};

const scopesOf = (changes: readonly ScopeChange[], kind: ScopeChange['change']) =>
  changes.filter(({ change }) => change === kind).map(({ scope }) => scope);

/**
 * Groups changes to an app's access as a publisher reads them: what it gains and what it gives
 * up. Kinds with nothing in them are left out. `pending` words them as what a suspension asked
 * for.
 */
export function describeScopeChanges(
  changes: readonly ScopeChange[],
  { pending = false }: { pending?: boolean } = {},
): ScopeChangeGroup[] {
  const headings = pending ? PENDING_HEADINGS : HEADINGS;
  return (Object.keys(HEADINGS) as ScopeChangeGroup['kind'][]).flatMap((kind) => {
    const lines = describeScopes(scopesOf(changes, kind));
    return lines.length ? [{ kind, heading: headings[kind], lines }] : [];
  });
}

/**
 * How an update changes the access its review lists: which of the new version's scopes are new,
 * and what it no longer has, one line per resource.
 */
export interface ScopeMarks {
  added: ReadonlySet<AppPermissionKey>;
  removed: ScopeLine[];
}

export function markScopeChanges(changes: readonly ScopeChange[]): ScopeMarks {
  return {
    added: new Set(scopesOf(changes, 'added')),
    removed: describeScopes(scopesOf(changes, 'removed')),
  };
}

const ENDS_A_SUSPENSION: ReadonlySet<AppInstallationHistoryEntry['event']> = new Set([
  'suspended',
  'resumed',
  'changes_approved',
  'uninstalled',
]);

const sameScopeChanges = (a: AppInstallationHistoryEntry, b: AppInstallationHistoryEntry) =>
  JSON.stringify(splitChanges(a.changes ?? []).scopes) ===
  JSON.stringify(splitChanges(b.changes ?? []).scopes);

/**
 * The scope changes to show with each history entry, newest first as the history is. A
 * suspension's changes are left out once an approval granted exactly them, as the approval shows
 * them; one withdrawn, replaced or still waiting keeps what it asked for.
 */
export function historyScopeChanges(
  entries: readonly AppInstallationHistoryEntry[],
): ScopeChange[][] {
  return entries.map((entry, index) => {
    const scopes = splitChanges(entry.changes ?? []).scopes;
    if (entry.event !== 'suspended') {
      return scopes;
    }
    const outcome = entries
      .slice(0, index)
      .reverse()
      .find(({ event }) => ENDS_A_SUSPENSION.has(event));
    return outcome?.event === 'changes_approved' && sameScopeChanges(entry, outcome) ? [] : scopes;
  });
}
