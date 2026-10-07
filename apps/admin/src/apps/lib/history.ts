import type { Action } from '@tryghost/admin-x-framework/api/actions';
import type { AppInstallationManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { movedBetween } from './served-from';

/** One thing that happened to an installed app, newest first on its detail page. */
export interface AppHistoryEntry {
  id: string;
  /** What happened, in a few words. */
  title: string;
  /** The staff user who decided it. Updates and suspensions are Ghost's own, with nobody. */
  by?: string;
  at: string;
}

function contextString(action: Action, key: string): string | undefined {
  const value = action.context?.[key];
  return typeof value === 'string' ? value : undefined;
}

/** Who installed the app, as staff history recorded it. */
export function installedBy(actions: Action[]): string | undefined {
  return actions.find((action) => action.event === 'installed')?.actor?.name;
}

/**
 * The app's history: decisions by people come from staff history, and what Ghost did by
 * itself (updates, and changes waiting for approval) from the installation's manifests.
 *
 * The oldest manifest is the one installed, so installing is told by that row, with whoever
 * staff history says installed it. A manifest an approval points at is told by the approval.
 */
export function appHistory(
  actions: Action[],
  manifests: AppInstallationManifest[],
): AppHistoryEntry[] {
  const byTime = (a: { created_at: string }, b: { created_at: string }) =>
    Date.parse(a.created_at) - Date.parse(b.created_at);
  // Oldest first throughout, so entries from the same second keep the order they happened in.
  const chronological = [...actions].sort(byTime);
  const manifestsById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  const approvals = chronological.filter((action) => action.event === 'changes_approved');
  const approvedIds = new Set(approvals.map((action) => contextString(action, 'to_manifest_id')));
  const installer = installedBy(actions);

  const entries: AppHistoryEntry[] = [];
  const installed = manifests[manifests.length - 1];
  if (installed) {
    entries.push({ id: installed.id, title: 'Installed', by: installer, at: installed.created_at });
  }
  for (const manifest of manifests.slice(0, -1).reverse()) {
    if (!approvedIds.has(manifest.id)) {
      entries.push({
        id: manifest.id,
        title: manifest.requires_approval ? 'Updated, needs approval' : 'Updated',
        at: manifest.created_at,
      });
    }
  }
  for (const action of approvals) {
    const from = manifestsById.get(contextString(action, 'from_manifest_id') ?? '');
    const to = manifestsById.get(contextString(action, 'to_manifest_id') ?? '');
    const move = from && to ? movedBetween(from, to) : null;
    entries.push({
      id: action.id,
      title: move ? `Moved to ${move.to}` : 'Changes approved',
      by: action.actor?.name,
      at: action.created_at,
    });
  }
  for (const action of chronological.filter(({ event }) => event === 'uninstalled')) {
    entries.push({
      id: action.id,
      title: 'Uninstalled',
      by: action.actor?.name,
      at: action.created_at,
    });
  }

  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).reverse();
}
