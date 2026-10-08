import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';

/** What happened, in a few words, for the app's history on its detail page. */
export function historyTitle(entry: AppInstallationHistoryEntry): string {
  switch (entry.event) {
    case 'installed':
      return 'Installed';
    case 'updated':
      return 'Updated';
    case 'suspended':
      return 'Updated, needs approval';
    case 'changes_approved':
      return entry.moved_to ? `Moved to ${entry.moved_to}` : 'Changes approved';
    case 'uninstalled':
      return 'Uninstalled';
  }
}

/** Who installed the app, as its history records it. */
export function installedBy(history: AppInstallationHistoryEntry[]): string | undefined {
  return history.find((entry) => entry.event === 'installed')?.actor?.name ?? undefined;
}
